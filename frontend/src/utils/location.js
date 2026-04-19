export function normalizeLocationPart(part) {
  if (!part) return '';
  // Avoid breaking our "-" separator format.
  return String(part).trim().replace(/-/g, ' ').replace(/\s+/g, ' ');
}

export function isValidPin(pin) {
  if (pin == null) return false;
  const s = String(pin).trim();
  return /^\d{6}$/.test(s);
}

export function buildLocationString({ state, district, locality, pin }) {
  const s = normalizeLocationPart(state);
  const d = normalizeLocationPart(district);
  const l = normalizeLocationPart(locality);
  const p = String(pin ?? '').trim();
  return [s, d, l, p].filter(Boolean).join('-');
}

export function parseLocationString(locationStr) {
  const raw = (locationStr ?? '').trim();
  if (!raw) {
    return { state: '', district: '', locality: '', pin: '', raw: '' };
  }

  const parts = raw.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const [state, district, locality, pin] = parts;
    return {
      state: state || '',
      district: district || '',
      locality: locality || '',
      pin: pin || '',
      raw,
    };
  }

  // Legacy/unknown format: keep raw and leave structured fields empty.
  return { state: '', district: '', locality: '', pin: '', raw };
}

