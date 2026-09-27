/**
 * Applicant document upload / view / delete.
 *
 * Storage layout
 *   bucket: applicant-documents  (private — never public)
 *   key:    {applicant_id}/{document_code}/{uuid}{ext}
 *
 * The first path segment is the ownership boundary. The storage.objects policies
 * in 20260926090300_applicant_documents_storage.sql only allow reads and writes
 * whose first segment equals public.current_applicant_id(), so a key crafted by
 * the client cannot reach another applicant's file even if the UI is bypassed.
 *
 * Rules honoured here
 *   - Files are never inlined into a data URL, never sent to a third party, and
 *     never logged.
 *   - "View" is a 60-second signed URL issued after the policy check passes; the
 *     path itself is not exposed to anyone else.
 *   - The bucket rejects anything that is not PDF/JPEG/PNG and anything over
 *     5 MB, independently of the checks below, so a bypassed UI still cannot
 *     write a 200 MB file.
 */

import { supabase } from '../lib/supabase';
import { messageFromError } from '../lib/dbErrorMessage';
import type { ApplicantDocumentRecord } from '../types/profile';

const BUCKET = 'applicant-documents';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const SIGNED_URL_TTL_SECONDS = 60;

export interface DocumentServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function client() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to upload documents.',
    );
  }
  return supabase;
}

/**
 * Applicant-facing database errors are filtered in one place, not per call site.
 * The two services that write applicant data used to carry identical private
 * copies of this helper, so the filter had to be corrected in both and a third
 * copy would have reintroduced the raw-message behaviour.
 */

function extensionOf(file: File): string {
  const fromName = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(fromName) ? fromName : '';
}

/** Human-readable size, in the unit the guideline used. */
function formatSizeLimit(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate before spending an upload. Returns a message, or null when valid.
 *
 * `maxFileSizeMb` is the scheme's own `scheme_documents.max_file_size_mb`, which
 * is NULL for the schemes whose guidelines state no limit — a null means "no
 * scheme limit recorded", not "zero". When present it is checked as well as the
 * 5 MB application cap, because ARG45 caps uploads at 500 KB and AZKMI at 100 KB,
 * and an applicant told "5 MB or smaller" would otherwise only discover the real
 * limit when the portal rejected the file.
 */
export function validateDocumentFile(file: File, maxFileSizeMb?: number | null): string | null {
  if (!ALLOWED.includes(file.type)) {
    return 'Upload a PDF, JPG or PNG file.';
  }
  if (!extensionOf(file)) {
    return 'The file name must end in .pdf, .jpg, .jpeg or .png.';
  }
  if (typeof maxFileSizeMb === 'number' && maxFileSizeMb > 0) {
    const schemeLimit = maxFileSizeMb * 1024 * 1024;
    if (file.size > schemeLimit) {
      return `This scheme's guideline caps "${file.name}" at ${formatSizeLimit(schemeLimit)}.`;
    }
  }
  if (file.size > MAX_BYTES) {
    return 'The file must be 5 MB or smaller.';
  }
  if (file.size === 0) {
    return 'The file is empty.';
  }
  return null;
}

export interface UploadInput {
  applicantId: string;
  documentCode: string;
  file: File;
  /** scheme_documents.max_file_size_mb, or null when the guideline states none. */
  maxFileSizeMb?: number | null;
}

/**
 * Human label for a document code, used to fill the NOT NULL `document_name`
 * column. Codes arrive from resolveDocumentCode(), which slugifies whatever the
 * scheme guideline called the document, so a known code gets a proper name and
 * anything else is de-slugged rather than shown as a raw identifier.
 */
function documentLabel(code: string): string {
  const labels: Record<string, string> = {
    aadhaar: 'Aadhaar Card',
    aadhaar_card: 'Aadhaar Card',
    income_certificate: 'Income Certificate',
    caste_certificate: 'Category Certificate',
    domicile_certificate: 'Domicile Certificate',
    disability_certificate: 'Disability Certificate',
    hostel_certificate: 'Hostel Certificate',
    hosteller_certificate: 'Hostel Certificate',
    previous_marksheet: 'Previous Marksheet',
    marksheet: 'Marksheet',
    bank_passbook: 'Bank Passbook',
    bank: 'Bank Passbook',
    admission_proof: 'Admission Proof',
    admission: 'Admission Proof',
    birth_certificate: 'Birth Certificate',
    photo: 'Photograph',
    signature: 'Signature',
    offer_letter: 'Offer Letter',
    degree_certificate: 'Degree Certificate',
    fee_receipt: 'Fee Receipt',
  };
  if (labels[code]) return labels[code];
  return code
    .split('_')
    .filter((part) => part !== '')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Document';
}

export async function uploadDocument({
  applicantId,
  documentCode,
  file,
  maxFileSizeMb,
}: UploadInput): Promise<DocumentServiceResult<ApplicantDocumentRecord>> {
  const sb = client();

  const invalid = validateDocumentFile(file, maxFileSizeMb);
  if (invalid) {
    return { ok: false, error: invalid };
  }

  const safeCode = documentCode.replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'document';
  const unique = crypto.randomUUID();
  const storagePath = `${applicantId}/${safeCode}/${unique}${extensionOf(file)}`;

  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, error: messageFromError(uploadError, 'The file could not be uploaded.') };
  }

  // Metadata only. The bytes are already in storage; this row is what the
  // completeness engine reads to know a document exists.
  //
  // `document_type` carries the controlled code because it is the only code
  // column on `applicant_documents`, and the profile certificate slots plus
  // matchExistingDocument() both key on it. `document_name` is the human label
  // and is NOT NULL, so it is derived from the code rather than left to the
  // caller to supply. `verification_status` defaults to 'pending' in the
  // database, so it is not written here; the DB CHECK allows only
  // pending/ai_verified/human_verified/rejected.
  const { data, error } = await sb
    .from('applicant_documents')
    .insert({
      applicant_id: applicantId,
      document_type: documentCode,
      document_name: documentLabel(safeCode),
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    // Do not leave an orphaned object behind when the metadata write fails.
    await sb.storage.from(BUCKET).remove([storagePath]);
    return { ok: false, error: messageFromError(error, 'The file could not be recorded.') };
  }

  return { ok: true, data: data as ApplicantDocumentRecord };
}

/** Short-lived signed URL. The stored path is never returned to the caller. */
export async function createViewUrl(
  document: Pick<ApplicantDocumentRecord, 'storage_path' | 'file_name'>,
): Promise<DocumentServiceResult<string>> {
  const sb = client();

  if (!document.storage_path) {
    return { ok: false, error: 'This document has no stored file.' };
  }

  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return { ok: false, error: messageFromError(error, 'The document could not be opened.') };
  }

  return { ok: true, data: data.signedUrl };
}

export async function deleteDocument(document: ApplicantDocumentRecord): Promise<DocumentServiceResult<null>> {
  const sb = client();

  if (document.storage_path) {
    const { error } = await sb.storage.from(BUCKET).remove([document.storage_path]);
    if (error) {
      return { ok: false, error: messageFromError(error, 'The file could not be removed.') };
    }
  }

  const { error } = await sb.from('applicant_documents').delete().eq('id', document.id);
  if (error) {
    return { ok: false, error: messageFromError(error, 'The document record could not be removed.') };
  }

  return { ok: true };
}

export const DOCUMENT_ACCEPTED_TYPES = ALLOWED.join(',');
export const DOCUMENT_MAX_BYTES = MAX_BYTES;
