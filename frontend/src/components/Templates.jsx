// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { templateService } from '../services/api';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  // Categories for filter
  const categories = ['Events', 'Campaigns', 'Fundraising', 'Social Media', 'Other'];

  useEffect(() => {
    fetchTemplates();
  }, []);


  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const fetchedApiTemplates = await templateService.getTemplates(token);
      const localTemplates = JSON.parse(localStorage.getItem('templates')) || [];
      
      // Merge API and local templates
      const mergedTemplates = [...fetchedApiTemplates];
      localTemplates.forEach((localTemplate) => {
        if (!fetchedApiTemplates.find(apiTemplate => apiTemplate.id === localTemplate.id)) {
          mergedTemplates.push(localTemplate);
        }
      });
      
      setTemplates(mergedTemplates);
    } catch (error) {
      setError('Failed to load templates');
      console.error('Error fetching templates:', error);
      
      // Fallback to localStorage if API fails
      const localTemplates = JSON.parse(localStorage.getItem('templates') || '[]');
      setTemplates(localTemplates);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate('/editor/new');
  };

  const handleEditTemplate = (template) => {
    try {
      // Get current saved templates
      const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '[]');
      
      // Check if template exists
      const exists = savedTemplates.some(t => t.id === template.id);
      
      if (!exists) {
        // Add template to savedTemplates if it doesn't exist
        savedTemplates.push(template);
        localStorage.setItem('savedTemplates', JSON.stringify(savedTemplates));
      }
      
      // Navigate to editor
      navigate(`/editor/${template.id}`);
    } catch (error) {
      console.error('Error preparing template for edit:', error);
      setError('Failed to edit template');
    }
  };
  const handleDeleteTemplate = async (template) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      // If it's an API template (has image_url), delete from API
      if (template.image_url) {
        const token = localStorage.getItem('token');
        await templateService.deleteTemplate(template.id, token);
      } else {
        // If it's a local template, delete from localStorage
        const localTemplates = JSON.parse(localStorage.getItem('templates') || '[]');
        const updatedTemplates = localTemplates.filter(t => t.id !== template.id);
        localStorage.setItem('templates', JSON.stringify(updatedTemplates));
      }
      
      // Refresh templates list
      await fetchTemplates();
    } catch {
      setError('Failed to delete template');
    }
  };

  const filteredTemplates = filter === 'all' 
    ? templates 
    : templates.filter(template => template.category === filter);

  const getTemplateImage = (template) => {
    if (template.image_url) {
        return `http://localhost:5000${template.image_url}`;
      }
      return template.thumbnail || 'https://via.placeholder.com/400x300?text=Template+Preview';
    };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Templates</h1>
        <button
          onClick={handleCreateNew}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Create New Template
        </button>
      </div>

      {/* Filter Section */}
      <div className="mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-md whitespace-nowrap ${
                filter === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          {error}
        </div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">No templates found</p>
          <button
            onClick={handleCreateNew}
            className="text-blue-500 hover:text-blue-600"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Template Preview */}
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={getTemplateImage(template)}
                  alt={template.name}
                  className="object-cover w-full h-48"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x300?text=Template+Preview';
                  }}
                />
              </div>
              
              {/* Template Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                  {template.category}
                </span>
                
                {/* Template Actions */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                  <span className="text-gray-500 text-sm">
                    Downloads: {template.downloads || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;