const API_URL = 'https://neon-aura-backend.onrender.com/api';

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const sendOtp = (phoneNumber) =>
  fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  }).then(handleResponse);

export const verifyOtp = (phoneNumber, otp) =>
  fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, otp }),
  }).then(handleResponse);

export const signOut = () => {
  const token = localStorage.getItem('chat_token');
  return fetch(`${API_URL}/auth/signout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).then(handleResponse);
};

export const getLiveStats = () =>
  fetch(`${API_URL}/stats/live`)
    .then(r => r.ok ? r.json() : { liveUsers: 0 })
    .catch(() => ({ liveUsers: 0 }));

