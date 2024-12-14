// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { templateService } from '../services/api';

// Import default images for fallback
import eventAnnouncementImg from '../assets/event_announcement.png';
import raise_awareness from '../assets/raise_awareness.jpg';
import fundraising from '../assets/fundraising.png';
import impact from '../assets/impact.png';

const defaultTemplates = [
  { id: 1, name: 'Event Announcement', category: 'Events', thumbnail: eventAnnouncementImg },
  { id: 2, name: 'Awareness Campaign', category: 'Campaign', thumbnail: raise_awareness },
  { id: 3, name: 'Fundraising Post', category: 'Fundraising', thumbnail: fundraising },
  { id: 4, name: 'Impact Story', category: 'Stories', thumbnail: impact }
];

const Dashboard = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        const fetchedTemplates = await templateService.getTemplates(token);
        
        // Map the server response to match our template structure
        const formattedTemplates = fetchedTemplates.map(template => ({
          id: template.id,
          name: template.name,
          category: template.category,
          // Use image_url if available, otherwise fall back to a default image based on category
          thumbnail: template.image_url 
            ? `http://localhost:5000${template.image_url}`
            : defaultTemplates.find(t => t.category === template.category)?.thumbnail || defaultTemplates[0].thumbnail
        }));

        // If no templates are fetched, use default templates
        setTemplates(formattedTemplates.length > 0 ? formattedTemplates : defaultTemplates);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        setError('Failed to load templates. Using default templates instead.');
        setTemplates(defaultTemplates);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateClick = (templateId) => {
    navigate(`/editor/${templateId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading templates...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Default Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {defaultTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => handleTemplateClick(template.id)}
            >
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="object-cover w-full h-48"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = defaultTemplates[0].thumbnail;
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
                <span className="text-sm text-gray-500">{template.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.organizationName}</h1>
          <p className="text-gray-600">Choose a template to get started</p>
        </div>

        {error && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
            {error}
          </div>
        )}

        {templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600">No templates created yet. <a href="/create-template" className="text-blue-500">Create a template</a></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                onClick={() => handleTemplateClick(template.id)}
              >
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="object-cover w-full h-48"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = defaultTemplates[0].thumbnail;
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{template.category}</span>
                    <span className="text-xs text-gray-400">
                      {template.downloads}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Recent Downloads</h2>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600">No recent downloads</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;