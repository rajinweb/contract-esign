const api = {
  get: async (url: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api${url}`, {
      method: 'GET',
      headers,
    });
    return response.json();
  },
  post: async (url: string, data: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },
  patch: async (url: string, data: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('AccessToken') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`/api${url}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

export { api };
