/**
 * Section 2 — Address Information.
 *
 * Districts and talukas are not seeded (they are notified per district by the
 * revenue department), so both controls offer a free-text fallback. When
 * "same as permanent" is ticked the correspondence block is not merely hidden —
 * the save writes the permanent values into the correspondence columns, so the
 * two can never drift apart and a scheme that reads the correspondence address
 * always finds it populated.
 */

import { FORM_GRID_CLASS, Fieldset, SelectField, TextAreaField, TextField } from '../ProfileFields';
import type { AddressFormValues, ProfileMasterData } from '../../../types/profile';

export interface AddressSectionProps {
  values: AddressFormValues;
  onChange: (patch: Partial<AddressFormValues>) => void;
  errors: Record<string, string>;
  master: ProfileMasterData;
}

export function AddressSection({ values, onChange, errors, master }: AddressSectionProps) {
  const stateOptions = master.states.map((row) => ({ value: row.name, label: row.name }));

  return (
    <div className="space-y-6">
      <Fieldset legend="Permanent address">
        <div className={FORM_GRID_CLASS}>
          <TextAreaField
            className="sm:col-span-2 lg:col-span-3"
            error={errors.permanent_address}
            label="Permanent address"
            onChange={(value) => onChange({ permanent_address: value })}
            placeholder="House / street / area"
            required
            value={values.permanent_address}
          />
          <TextField
            error={errors.permanent_village}
            label="Village / city / town"
            onChange={(value) => onChange({ permanent_village: value })}
            required
            value={values.permanent_village}
          />
          <SelectField
            allowCustom
            error={errors.permanent_state}
            label="State"
            onChange={(value) => onChange({ permanent_state: value })}
            options={stateOptions}
            required
            value={values.permanent_state}
          />
          <SelectField
            allowCustom
            error={errors.permanent_district}
            hint="No district list is pre-loaded; type it if it is not listed."
            label="District"
            onChange={(value) => onChange({ permanent_district: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.permanent_district}
          />
          <SelectField
            allowCustom
            error={errors.permanent_taluka}
            label="Taluka / block"
            onChange={(value) => onChange({ permanent_taluka: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.permanent_taluka}
          />
          <TextField
            error={errors.permanent_pincode}
            inputMode="numeric"
            label="Pincode"
            maxLength={6}
            onChange={(value) => onChange({ permanent_pincode: value.replace(/\D/g, '').slice(0, 6) })}
            required
            value={values.permanent_pincode}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Correspondence address">
        <div className={FORM_GRID_CLASS}>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="flex cursor-pointer items-start gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700">
              <input
                checked={values.same_as_permanent}
                className="mt-0.5 h-3.5 w-3.5 accent-[#0b3b75]"
                onChange={(event) => onChange({ same_as_permanent: event.target.checked })}
                type="checkbox"
              />
              <span>
                <span className="font-semibold">Correspondence address is the same as the permanent address</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Tick this unless a different address should receive your scholarship correspondence.
                </span>
              </span>
            </label>
          </div>
        </div>

        {!values.same_as_permanent ? (
          <div className={FORM_GRID_CLASS}>
            <TextAreaField
              className="sm:col-span-2 lg:col-span-3"
              error={errors.correspondence_address}
              label="Correspondence address"
              onChange={(value) => onChange({ correspondence_address: value })}
              placeholder="House / street / area"
              required
              value={values.correspondence_address}
            />
            <TextField
              error={errors.correspondence_village}
              label="Village / city / town"
              onChange={(value) => onChange({ correspondence_village: value })}
              required
              value={values.correspondence_village}
            />
            <SelectField
              allowCustom
              error={errors.correspondence_state}
              label="State"
              onChange={(value) => onChange({ correspondence_state: value })}
              options={stateOptions}
              required
              value={values.correspondence_state}
            />
            <SelectField
              allowCustom
              error={errors.correspondence_district}
              label="District"
              onChange={(value) => onChange({ correspondence_district: value })}
              options={[]}
              placeholder="Type or select"
              required
              value={values.correspondence_district}
            />
            <SelectField
              allowCustom
              error={errors.correspondence_taluka}
              label="Taluka / block"
              onChange={(value) => onChange({ correspondence_taluka: value })}
              options={[]}
              placeholder="Type or select"
              required
              value={values.correspondence_taluka}
            />
            <TextField
              error={errors.correspondence_pincode}
              inputMode="numeric"
              label="Pincode"
              maxLength={6}
              onChange={(value) => onChange({ correspondence_pincode: value.replace(/\D/g, '').slice(0, 6) })}
              required
              value={values.correspondence_pincode}
            />
          </div>
        ) : null}
      </Fieldset>
    </div>
  );
}
