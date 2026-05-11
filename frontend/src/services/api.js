const API_URL = 'http://localhost:8080/api';

export const sendOtp = async (phoneNumber) => {
  const response = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber })
  });
  if (!response.ok) throw new Error('Failed to send OTP');
  return response.json();
};

export const verifyOtp = async (phoneNumber, otp) => {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, otp })
  });
  if (!response.ok) throw new Error('Failed to verify OTP');
  return response.json();
};

export const getLiveStats = async () => {
  const response = await fetch(`${API_URL}/stats/live`);
  if (!response.ok) return { liveUsers: 0 };
  return response.json();
};
