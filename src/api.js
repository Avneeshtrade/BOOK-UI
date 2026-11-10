// All calls to the Spring Boot backend live here
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

function errorMessage(data, status) {
  if (data?.error) return data.error;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((e) => (typeof e === 'string' ? e : e.defaultMessage)).join('. ');
  }
  if (data?.message) return data.message;
  return `The server returned an error (${status}).`;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error(
      `Can't reach the server at ${API_URL}. Check that the backend is running and allows requests from this site.`
    );
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}

export const booksApi = {
  list: () => request('/api/books'),
  create: (book) => request('/api/books', { method: 'POST', body: JSON.stringify(book) }),
  update: (id, book) => request(`/api/books/${id}`, { method: 'PUT', body: JSON.stringify(book) }),
  remove: (id) => request(`/api/books/${id}`, { method: 'DELETE' }),
};
