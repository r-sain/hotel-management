import initialGuests from '../data/guests.json';

const STORAGE_KEY = 'shalimar-demo-guests-v1';

function statusForCheckout(checkoutAt) {
  if (!checkoutAt) return 'checked-in';
  const checkoutTime = new Date(checkoutAt).getTime();
  return Number.isFinite(checkoutTime) && checkoutTime <= Date.now()
    ? 'checked-out'
    : 'checked-in';
}

function readGuests() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const guests =
    saved === null
      ? JSON.parse(JSON.stringify(initialGuests))
      : JSON.parse(saved);
  let statusChanged = false;
  const currentGuests = guests.map(guest => {
    const status = statusForCheckout(guest.checkout_at);
    if (guest.status === status) return guest;
    statusChanged = true;
    return { ...guest, status };
  });
  if (saved === null || statusChanged) writeGuests(currentGuests);
  return currentGuests;
}

function writeGuests(guests) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
  } catch {
    throw new Error(
      'Could not save demo data in this browser. Storage may be full.',
    );
  }
}

function apiError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function withBill(guest) {
  const rate = guest.gst_rate || 0;
  const total = guest.gst_included
    ? guest.last_bill_amount
    : Math.round(guest.last_bill_amount * (1 + rate / 100));
  const base = guest.gst_included
    ? Math.round(total / (1 + rate / 100))
    : guest.last_bill_amount;
  return {
    ...guest,
    base_amount: base,
    gst_amount: total - base,
    bill_total: total,
    bill_due:
      guest.bill_due_manual !== null
        ? guest.bill_due_manual
        : total - guest.rent_paid,
    bill_due_source: guest.bill_due_manual !== null ? 'manual' : 'auto',
  };
}

function findGuest(guests, id) {
  const guest = guests.find(item => item.id === Number(id));
  if (!guest) throw apiError('Guest not found', 404);
  return guest;
}

function toPaise(value, field, { allowNull = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (allowNull) return null;
    return 0;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw apiError(`${field} must be a non-negative number`);
  }
  return Math.round(amount * 100);
}

function parseGuest(body) {
  const name = String(body.name || '').trim();
  const room_no = String(body.room_no || '').trim();
  const no_of_persons = Number(body.no_of_persons);
  const checkin_at = String(body.checkin_at || '').trim();
  const gst_rate = Number(body.gst_rate ?? 5);

  if (!name) throw apiError('Name is required');
  if (!room_no) throw apiError('Room no. is required');
  if (
    !Number.isInteger(no_of_persons) ||
    no_of_persons < 1 ||
    no_of_persons > 50
  ) {
    throw apiError('No. of persons must be a whole number (1-50)');
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(checkin_at)) {
    throw apiError('Check-in date+time is required');
  }
  if (!Number.isFinite(gst_rate) || gst_rate < 0 || gst_rate > 50) {
    throw apiError('GST rate must be 0-50');
  }

  return {
    name,
    room_no,
    no_of_persons,
    checkin_at,
    checkout_at: body.checkout_at || null,
    rent_paid: toPaise(body.rent_paid, 'Bill paid'),
    last_bill_amount: toPaise(body.last_bill_amount, 'Bill amount'),
    gst_included: body.gst_included ? 1 : 0,
    gst_rate,
    bill_due_manual: toPaise(body.bill_due_manual, 'Manual bill due', {
      allowNull: true,
    }),
    bill_due_note: body.bill_due_note
      ? String(body.bill_due_note).trim()
      : null,
  };
}

function assertRoomAvailable(guests, roomNo, exceptId = 0) {
  const occupied = guests.find(
    guest =>
      guest.room_no.toLowerCase() === roomNo.toLowerCase() &&
      guest.status === 'checked-in' &&
      guest.id !== exceptId,
  );
  if (occupied) {
    throw apiError(
      `Room ${roomNo} is already occupied by ${occupied.name}. Choose another room.`,
      409,
    );
  }
}

function saveAndReturn(guests, guest) {
  writeGuests(guests);
  return withBill(guest);
}

function localNow() {
  const date = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const api = {
  async listGuests(params = {}) {
    const search = String(params.search || '').toLowerCase();
    return readGuests()
      .filter(
        guest =>
          !['checked-in', 'checked-out'].includes(params.status) ||
          guest.status === params.status,
      )
      .filter(
        guest =>
          !search ||
          `${guest.name} ${guest.room_no}`.toLowerCase().includes(search),
      )
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'checked-in' ? -1 : 1;
        return (
          a.room_no.localeCompare(b.room_no, undefined, {
            numeric: true,
            sensitivity: 'base',
          }) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
      })
      .map(withBill);
  },

  async getGuest(id) {
    return withBill(findGuest(readGuests(), id));
  },

  async createGuest(body) {
    const guests = readGuests();
    const fields = parseGuest(body);
    if (statusForCheckout(fields.checkout_at) === 'checked-in') {
      assertRoomAvailable(guests, fields.room_no);
    }
    const id = guests.reduce((max, guest) => Math.max(max, guest.id), 0) + 1;
    const timestamp = new Date().toISOString();
    const guest = {
      ...fields,
      id,
      status: statusForCheckout(fields.checkout_at),
      face_photo: null,
      id_photo: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    guests.push(guest);
    return saveAndReturn(guests, guest);
  },

  async updateGuest(id, body) {
    const guests = readGuests();
    const existing = findGuest(guests, id);
    const fields = parseGuest(body);
    if (statusForCheckout(fields.checkout_at) === 'checked-in') {
      assertRoomAvailable(guests, fields.room_no, existing.id);
    }
    const updated = {
      ...existing,
      ...fields,
      status: statusForCheckout(fields.checkout_at),
      updated_at: new Date().toISOString(),
    };
    guests[guests.indexOf(existing)] = updated;
    return saveAndReturn(guests, updated);
  },

  async checkOut(id, checkoutAt) {
    const guests = readGuests();
    const guest = findGuest(guests, id);
    const scheduledCheckout = checkoutAt || localNow();
    const updated = {
      ...guest,
      checkout_at: scheduledCheckout,
      status: statusForCheckout(scheduledCheckout),
      updated_at: new Date().toISOString(),
    };
    guests[guests.indexOf(guest)] = updated;
    return saveAndReturn(guests, updated);
  },

  async reopen(id) {
    const guests = readGuests();
    const guest = findGuest(guests, id);
    assertRoomAvailable(guests, guest.room_no, guest.id);
    const updated = {
      ...guest,
      checkout_at: null,
      status: 'checked-in',
      updated_at: new Date().toISOString(),
    };
    guests[guests.indexOf(guest)] = updated;
    return saveAndReturn(guests, updated);
  },

  async removeGuest(id) {
    const guests = readGuests();
    findGuest(guests, id);
    writeGuests(guests.filter(guest => guest.id !== Number(id)));
  },

  async uploadPhoto(id, kind, dataUrl) {
    if (!['face', 'id'].includes(kind))
      throw apiError('Photo kind must be "face" or "id"');
    if (
      typeof dataUrl !== 'string' ||
      !/^data:image\/(jpeg|jpg|png);base64,/.test(dataUrl)
    ) {
      throw apiError('Expected a base64 JPEG/PNG data URL in "dataUrl"');
    }
    const guests = readGuests();
    const guest = findGuest(guests, id);
    const updated = {
      ...guest,
      [kind === 'face' ? 'face_photo' : 'id_photo']: dataUrl,
      updated_at: new Date().toISOString(),
    };
    guests[guests.indexOf(guest)] = updated;
    return saveAndReturn(guests, updated);
  },
};

export function photoUrl(guest, kind) {
  const value = kind === 'face' ? guest?.face_photo : guest?.id_photo;
  if (!value) return null;
  return value.startsWith('data:') ? value : `/uploads/${value}`;
}
