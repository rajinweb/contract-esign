const api = {
  get: async (url: string) => {
    const response = await fetch(`/api${url}`, {
      method: 'GET',
      // Auth is handled via httpOnly cookie on the same origin.
      credentials: 'include',
    });
    return response.json();
  },
  post: async (url: string, data: any) => {
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return response.json();
  },
  patch: async (url: string, data: any) => {
    const response = await fetch(`/api${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return response.json();
  },
};

export { api };
