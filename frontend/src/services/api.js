import { API_URL } from '../config';

export const authService = {
  async login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    return response.json();
  },

  async register(userData) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    return response.json();
  }
};

export const templateService = {
  async getTemplates(token) {
    const response = await fetch(`${API_URL}/templates`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }

    return response.json();
  },

  async getTemplate(id, token) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }

    return response.json();
  },

  async createTemplate(formData, token) {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to create template');
    }

    return response.json();
  },

  async updateTemplate(id, formData, token) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to update template');
    }

    return response.json();
  },

  async deleteTemplate(id, token) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete template');
    }

    return response.json();
  }
};