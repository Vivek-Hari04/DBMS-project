import { useEffect, useMemo, useState, useRef } from 'react';
import indiaData from '../../data/indiaStatesDistricts.json';
import { buildLocationString, isValidPin, parseLocationString } from '../../utils/location';

function StructuredLocationField({
  value,
  onChange,
  disabled = false,
  required = false,
  label = 'Location',
}) {
  const parsed = useMemo(() => parseLocationString(value || ''), [value]);

  const [stateName, setStateName] = useState(parsed.state || '');
  const [district, setDistrict] = useState(parsed.district || '');
  const [locality, setLocality] = useState(parsed.locality || '');
  const [pin, setPin] = useState(parsed.pin || '');

  const valueString = useMemo(() => buildLocationString({ state: stateName, district, locality, pin }), [
    stateName,
    district,
    locality,
    pin,
  ]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    // If value changes from OUTSIDE (not matching our current internal build)
    // we need to re-sync our internal fields. 
    // This allows "Use my profile location" to work without breaking typing.
    if (value !== undefined && value !== valueString) {
      setStateName(parsed.state || '');
      setDistrict(parsed.district || '');
      setLocality(parsed.locality || '');
      setPin(parsed.pin || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const states = indiaData.states.map((s) => s.state);
  const districtsForState = useMemo(() => {
    const row = indiaData.states.find((s) => s.state === stateName);
    return row?.districts || [];
  }, [stateName]);

  useEffect(() => {
    // Publish internal changes to parent
    onChangeRef.current?.(valueString);
  }, [valueString]);

  const pinValid = !pin || isValidPin(pin);

  return (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 12, color: '#6b7280' }}>
            State
          </label>
          <input
            type="text"
            list="state-list"
            value={stateName}
            onChange={(e) => {
              setStateName(e.target.value);
              setDistrict('');
            }}
            className="form-input w-full"
            placeholder="Select state"
            disabled={disabled}
            required={required}
          />
          <datalist id="state-list">
            {states.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 12, color: '#6b7280' }}>
            District
          </label>
          <input
            type="text"
            list="district-list"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="form-input w-full"
            placeholder={stateName ? 'Select district' : 'Select state first'}
            disabled={disabled || !stateName}
            required={required}
          />
          <datalist id="district-list">
            {districtsForState.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 12, color: '#6b7280' }}>
            Locality
          </label>
          <input
            type="text"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="form-input w-full"
            placeholder="Area / street / landmark"
            disabled={disabled}
            required={required}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 12, color: '#6b7280' }}>
            PIN code
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            className="form-input w-full"
            placeholder="6-digit PIN"
            disabled={disabled}
            required={required}
            aria-invalid={!pinValid}
          />
          {!pinValid && (
            <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>PIN must be 6 digits.</div>
          )}
        </div>
      </div>

      {parsed.raw && !parsed.state && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
          Existing location format detected: <span style={{ fontFamily: 'monospace' }}>{parsed.raw}</span>. Re-save to
          normalize.
        </div>
      )}
    </div>
  );
}

export default StructuredLocationField;

