/** @format */

// eslint-disable-next-line no-unused-vars
import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { useNavigate, useParams } from "react-router-dom";
import { templateService } from "../services/api";
import { SketchPicker } from "react-color";
const TemplateEditor = () => {
  const { id } = useParams();
  const [elements, setElements] = useState([]);
  const [text, setText] = useState("");
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("Events");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(!!id);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(20);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [editingElement, setEditingElement] = useState(null);
  const [textAlign, setTextAlign] = useState("left");
  const [fontWeight, setFontWeight] = useState("normal");
  const [fontStyle, setFontStyle] = useState("normal");
  const [textDecoration, setTextDecoration] = useState("none");
  const [headingSize, setHeadingSize] = useState("normal");
  const [textCaps, setTextCaps] = useState("none");
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // New state for preview mode

  const editorRef = useRef(null);
  const navigate = useNavigate();

  const categories = [
    "Events",
    "Campaigns",
    "Fundraising",
    "Social Media",
    "Other",
  ];

  const [imageProps, setImageProps] = useState({
    width: 200,
    height: 200,
    opacity: 100,
    rotation: 0,
    borderWidth: 0,
    borderColor: "#000000",
    borderRadius: 0,
  });

  useEffect(() => {
    if (id && id !== "new") {
      loadTemplate();
    }
  }, [id]);

  useEffect(() => {
    if (selectedElement && selectedElement.type === "image") {
      setImageProps({
        width: parseInt(selectedElement.style.width) || 200,
        height: parseInt(selectedElement.style.height) || 200,
        opacity: Math.round(
          (parseFloat(selectedElement.style.opacity) || 1) * 100
        ),
        rotation: parseInt(selectedElement.style.rotate) || 0,
        borderWidth: parseInt(selectedElement.style.borderWidth) || 0,
        borderColor: selectedElement.style.borderColor || "#000000",
        borderRadius: parseInt(selectedElement.style.borderRadius) || 0,
      });
    }
  }, [selectedElement]);

  const updateTextFormatting = (property, value) => {
    if (!selectedElement || selectedElement.type !== "text") return;

    const styleUpdates = {};

    switch (property) {
      case "heading":
        setHeadingSize(value);
        styleUpdates.fontSize =
          value === "normal"
            ? `${fontSize}px`
            : value === "h1"
              ? "32px"
              : value === "h2"
                ? "24px"
                : value === "h3"
                  ? "20px"
                  : `${fontSize}px`;
        break;
      case "align":
        setTextAlign(value);
        styleUpdates.textAlign = value;
        break;
      case "weight":
        setFontWeight(value);
        styleUpdates.fontWeight = value;
        break;
      case "style":
        setFontStyle(value);
        styleUpdates.fontStyle = value;
        break;
      case "decoration":
        setTextDecoration(value);
        styleUpdates.textDecoration = value;
        break;
      case "Caps":
        setTextCaps(value);
        styleUpdates.textTransform = value;
        break;
      default:
        break;
    }

    updateSelectedElementStyle(styleUpdates);
  };

  const handleDoubleClick = (element) => {
    if (element.type === "text") {
      setEditingElement(element);
    }
  };

  const handleTextChange = (e, elementId) => {
    const newElements = elements.map((el) =>
      el.id === elementId ? { ...el, content: e.target.value } : el
    );
    setElements(newElements);
  };

  const handleBlur = () => {
    setEditingElement(null);
    addToHistory(elements);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.blur();
    }
  };

  const loadTemplate = async () => {
    if (!id || id === "new") return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const template = await templateService.getTemplate(id, token);

      if (template) {
        setTemplateName(template.name);
        setCategory(template.category);
        setElements(JSON.parse(template.customization));
        // Set any other template properties
      }
    } catch (err) {
      setError("Failed to load template");
      console.error("Error loading template:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addToHistory = (newElements) => {
    setUndoStack([...undoStack, elements]);
    setRedoStack([]);
    setElements(newElements);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack([...redoStack, elements]);
    setElements(previousState);
    setUndoStack(undoStack.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack([...undoStack, elements]);
    setElements(nextState);
    setRedoStack(redoStack.slice(0, -1));
  };

  // eslint-disable-next-line no-unused-vars
  const saveTemplateToStorage = (template) => {
    // Get existing templates
    const existingTemplates = JSON.parse(
      localStorage.getItem("templates") || "[]"
    );

    // Add new template
    const newTemplate = {
      id: template.id || Date.now().toString(),
      name: template.name,
      category: template.category,
      customization: template.customization,
      createdAt: new Date().toISOString(),
      thumbnail: template.thumbnail,
    };

    // Add to array or update if exists
    const templateIndex = existingTemplates.findIndex(
      (t) => t.id === newTemplate.id
    );
    if (templateIndex > -1) {
      existingTemplates[templateIndex] = newTemplate;
    } else {
      existingTemplates.push(newTemplate);
    }

    // Save back to localStorage
    localStorage.setItem("templates", JSON.stringify(existingTemplates));
    return newTemplate;
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError("Please enter a template name");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const canvas = await html2canvas(editorRef.current, {
        backgroundColor: "white",
      });

      // Convert canvas to blob
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      // Create form data
      const formData = new FormData();
      formData.append("name", templateName);
      formData.append("category", category);
      formData.append("customization", JSON.stringify(elements));
      formData.append("isPublic", "false");
      formData.append("image", blob, "template.png");

      const token = localStorage.getItem("token");

      if (id && id !== "new") {
        await templateService.updateTemplate(id, formData, token);
      } else {
        await templateService.createTemplate(formData, token);
      }

      navigate("/templates");
    } catch (err) {
      setError(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const exportTemplate = async () => {
    const canvas = await html2canvas(editorRef.current, {
      backgroundColor: "white",
    });

    const link = document.createElement("a");
    link.download = `${templateName || "template"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const deleteSelectedElement = () => {
    if (selectedElement) {
      const newElements = elements.filter((el) => el.id !== selectedElement.id);
      addToHistory(newElements);
      setSelectedElement(null);
    }
  };

  const updateSelectedElementStyle = (styleUpdates) => {
    if (!selectedElement) return;

    const newElements = elements.map((el) =>
      el.id === selectedElement.id
        ? { ...el, style: { ...el.style, ...styleUpdates } }
        : el
    );
    addToHistory(newElements);
  };

  const addText = () => {
    if (!text) return;
    const editorRect = editorRef.current.getBoundingClientRect();
    const newElements = [
      ...elements,
      {
        id: Date.now(),
        type: "text",
        content: text,
        style: {
          position: "absolute",
          left: `${editorRect.width / 2 - 50}px`,
          top: `${editorRect.height / 2 - 20}px`,
          cursor: "move",
          userSelect: "none",
          padding: "8px",
          fontSize: `${fontSize}px`,
          color: selectedColor,
          border: "1px solid transparent",
          minWidth: "100px",
          backgroundColor: "transparent",
          textAlign: textAlign,
          fontWeight: fontWeight,
          fontStyle: fontStyle,
          textDecoration: textDecoration,
          zIndex: elements.length + 1,
        },
      },
    ];
    addToHistory(newElements);
    setText("");
  };

  const moveLayer = (elementId, direction) => {
    const elementIndex = elements.findIndex((el) => el.id === elementId);
    if (elementIndex === -1) return;

    const newElements = [...elements];
    const element = newElements[elementIndex];

    if (direction === "up" && elementIndex < elements.length - 1) {
      // Move layer up (increase z-index)
      element.style = {
        ...element.style,
        zIndex: (elements[elementIndex + 1].style.zIndex || 1) + 1,
      };
    } else if (direction === "down" && elementIndex > 0) {
      // Move layer down (decrease z-index)
      element.style = {
        ...element.style,
        zIndex: Math.max(1, (elements[elementIndex - 1].style.zIndex || 1) - 1),
      };
    } else if (direction === "top") {
      // Bring to front
      element.style = {
        ...element.style,
        zIndex: Math.max(...elements.map((el) => el.style.zIndex || 0)) + 1,
      };
    } else if (direction === "bottom") {
      // Send to back
      element.style = {
        ...element.style,
        zIndex: 1,
      };
    }

    setElements(newElements);
    addToHistory(newElements);
  };

  const handleBackgroundImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const editorRect = editorRef.current.getBoundingClientRect();
      const newElement = {
        id: Date.now(),
        type: "image",
        content: event.target.result,
        style: {
          position: "absolute",
          left: `${editorRect.width / 2 - 100}px`,
          top: `${editorRect.height / 2 - 100}px`,
          width: "200px",
          height: "200px",
          opacity: 1,
          rotate: "0",
          borderWidth: "0px",
          borderStyle: "none",
          borderColor: "#000000",
          borderRadius: "0%",
          transform: "none",
          cursor: "move",
          userSelect: "none",
          zIndex: elements.length + 1,
        },
      };

      const newElements = [...elements, newElement];
      setElements(newElements);
      setSelectedElement(newElement);
      addToHistory(newElements);
    };
    reader.readAsDataURL(file);
  };

  const handleImagePropChange = (prop, value) => {
    if (!selectedElement) return;

    const newProps = { ...imageProps, [prop]: value };
    setImageProps(newProps);

    const styleUpdates = {};

    switch (prop) {
      case "width":
        styleUpdates.width = `${value}px`;
        break;
      case "height":
        styleUpdates.height = `${value}px`;
        break;
      case "opacity":
        styleUpdates.opacity = value / 100;
        break;
      case "rotation":
        styleUpdates.transform = `rotate(${value}deg)`;
        styleUpdates.rotate = value;
        break;
      case "borderWidth":
        styleUpdates.borderWidth = `${value}px`;
        styleUpdates.borderStyle = value > 0 ? "solid" : "none";
        break;
      case "borderColor":
        styleUpdates.borderColor = value;
        break;
      case "borderRadius":
        styleUpdates.borderRadius = `${value}%`;
        break;
    }

    const newElements = elements.map((el) =>
      el.id === selectedElement.id
        ? { ...el, style: { ...el.style, ...styleUpdates } }
        : el
    );

    setElements(newElements);
    addToHistory(newElements);
  };

  const handleEditorClick = (e) => {
    // Only deselect if clicking directly on the editor
    if (e.target === editorRef.current) {
      setSelectedElement(null);
      setEditingElement(null);
    }
  };

  const handleMouseDown = (e, element) => {
    if (e.target === editorRef.current) {
      setSelectedElement(null);
      setEditingElement(null);
      return;
    }

    e.stopPropagation();
    setSelectedElement(element);

    if (editingElement) return; // Don't initiate drag while editing

    const elementRect = e.currentTarget.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    // Calculate offset relative to the editor
    const offsetX = e.clientX - elementRect.left;
    const offsetY = e.clientY - elementRect.top;

    let isDragging = true;

    const handleMouseMove = (moveEvent) => {
      if (!isDragging) return;

      const newLeft = moveEvent.clientX - editorRect.left - offsetX;
      const newTop = moveEvent.clientY - editorRect.top - offsetY;

      // Calculate bounds
      const maxLeft = editorRect.width - elementRect.width;
      const maxTop = editorRect.height - elementRect.height;

      // Apply boundaries
      const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const boundedTop = Math.max(0, Math.min(newTop, maxTop));

      const newElements = elements.map((el) =>
        el.id === element.id
          ? {
              ...el,
              style: {
                ...el.style,
                left: `${boundedLeft}px`,
                top: `${boundedTop}px`,
              },
            }
          : el
      );
      setElements(newElements);
    };

    const handleMouseUp = () => {
      isDragging = false;
      addToHistory(elements);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-gray-600">Loading template...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col space-y-4">
        {/* Template Details */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter template name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left Sidebar - Element Properties */}
          <div className="w-full md:w-1/4 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium mb-4">Add Elements</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Add Text</label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full p-2 border rounded mb-2"
                    placeholder="Enter text"
                  />
                  <button
                    onClick={addText}
                    className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                  >
                    Add Text
                  </button>
                </div>
                <div>
                  <label className="block text-sm mb-1">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadLogo}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {selectedElement && selectedElement.type === "image" && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium mb-4">Image Properties</h3>
                <div className="space-y-4">
                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm mb-1">Width (px)</label>
                      <input
                        type="number"
                        value={imageProps.width}
                        onChange={(e) =>
                          handleImagePropChange(
                            "width",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full p-2 border rounded"
                        min="10"
                        max="1000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Height (px)</label>
                      <input
                        type="number"
                        value={imageProps.height}
                        onChange={(e) =>
                          handleImagePropChange(
                            "height",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full p-2 border rounded"
                        min="10"
                        max="1000"
                      />
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="block text-sm mb-1">
                      Opacity ({imageProps.opacity}%)
                    </label>
                    <input
                      type="range"
                      value={imageProps.opacity}
                      onChange={(e) =>
                        handleImagePropChange(
                          "opacity",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                      min="0"
                      max="100"
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <label className="block text-sm mb-1">
                      Rotation ({imageProps.rotation}°)
                    </label>
                    <input
                      type="range"
                      value={imageProps.rotation}
                      onChange={(e) =>
                        handleImagePropChange(
                          "rotation",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                      min="0"
                      max="360"
                    />
                  </div>

                  {/* Border */}
                  <div>
                    <label className="block text-sm mb-1">
                      Border Width (px)
                    </label>
                    <input
                      type="number"
                      value={imageProps.borderWidth}
                      onChange={(e) =>
                        handleImagePropChange(
                          "borderWidth",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full p-2 border rounded mb-2"
                      min="0"
                      max="20"
                    />
                    <label className="block text-sm mb-1">Border Color</label>
                    <input
                      type="color"
                      value={imageProps.borderColor}
                      onChange={(e) =>
                        handleImagePropChange("borderColor", e.target.value)
                      }
                      className="w-full p-1 h-8 border rounded"
                    />
                  </div>

                  {/* Border Radius */}
                  <div>
                    <label className="block text-sm mb-1">
                      Border Radius ({imageProps.borderRadius}%)
                    </label>
                    <input
                      type="range"
                      value={imageProps.borderRadius}
                      onChange={(e) =>
                        handleImagePropChange(
                          "borderRadius",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full"
                      min="0"
                      max="50"
                    />
                  </div>

                  {/* Layer Controls */}
                  <div>
                    <label className="block text-sm mb-1">Layer Position</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => moveLayer(selectedElement.id, "top")}
                        className="p-2 border rounded hover:bg-blue-50"
                      >
                        Bring to Front
                      </button>
                      <button
                        onClick={() => moveLayer(selectedElement.id, "bottom")}
                        className="p-2 border rounded hover:bg-blue-50"
                      >
                        Send to Back
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add background image section */}
            <div className="bg-white p-4 rounded-lg shadow mt-4">
              <h3 className="font-medium mb-4">Background Image</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">
                    Upload Background
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImage}
                    className="w-full"
                  />
                </div>
                {backgroundImage && (
                  <button
                    onClick={() => setBackgroundImage(null)}
                    className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
                  >
                    Remove Background
                  </button>
                )}
              </div>
            </div>

            {/* Text Formatting Controls */}
            {selectedElement && selectedElement.type === "text" && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium mb-4">Text Formatting</h3>
                <div className="space-y-4">
                  {/* Text Style Selector */}
                  <div>
                    <label className="block text-sm mb-1">Text Style</label>
                    <select
                      value={headingSize}
                      onChange={(e) =>
                        updateTextFormatting("heading", e.target.value)
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="normal">Normal</option>
                      <option value="h1">Heading 1</option>
                      <option value="h2">Heading 2</option>
                      <option value="h3">Heading 3</option>
                    </select>
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="block text-sm mb-1">Alignment</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateTextFormatting("align", "left")}
                        className={`p-2 border rounded flex-1 ${
                          textAlign === "left" ? "bg-blue-100" : ""
                        }`}
                      >
                        Left
                      </button>
                      <button
                        onClick={() => updateTextFormatting("align", "center")}
                        className={`p-2 border rounded flex-1 ${
                          textAlign === "center" ? "bg-blue-100" : ""
                        }`}
                      >
                        Center
                      </button>
                      <button
                        onClick={() => updateTextFormatting("align", "right")}
                        className={`p-2 border rounded flex-1 ${
                          textAlign === "right" ? "bg-blue-100" : ""
                        }`}
                      >
                        Right
                      </button>
                    </div>
                  </div>

                  {/* Text Style Controls */}
                  <div>
                    <label className="block text-sm mb-1">Style</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateTextFormatting(
                            "weight",
                            fontWeight === "bold" ? "normal" : "bold"
                          )
                        }
                        className={`p-2 border rounded flex-1 ${
                          fontWeight === "bold" ? "bg-blue-100" : ""
                        }`}
                      >
                        Bold
                      </button>
                      <button
                        onClick={() =>
                          updateTextFormatting(
                            "style",
                            fontStyle === "italic" ? "normal" : "italic"
                          )
                        }
                        className={`p-2 border rounded flex-1 ${
                          fontStyle === "italic" ? "bg-blue-100" : ""
                        }`}
                      >
                        Italic
                      </button>
                      <button
                        onClick={() =>
                          updateTextFormatting(
                            "decoration",
                            textDecoration === "underline"
                              ? "none"
                              : "underline"
                          )
                        }
                        className={`p-2 border rounded flex-1 ${
                          textDecoration === "underline" ? "bg-blue-100" : ""
                        }`}
                      >
                        Underline
                      </button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block text-sm mb-1">Font Size</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => {
                          const size = Number(e.target.value);
                          setFontSize(size);
                          updateSelectedElementStyle({
                            fontSize: `${size}px`,
                          });
                        }}
                        className="w-full p-2 border rounded"
                      />
                      <button
                        onClick={() => {
                          const newSize = fontSize + 2;
                          setFontSize(newSize);
                          updateSelectedElementStyle({
                            fontSize: `${newSize}px`,
                          });
                        }}
                        className="p-2 border rounded"
                      >
                        +
                      </button>
                      <button
                        onClick={() => {
                          const newSize = Math.max(8, fontSize - 2);
                          setFontSize(newSize);
                          updateSelectedElementStyle({
                            fontSize: `${newSize}px`,
                          });
                        }}
                        className="p-2 border rounded"
                      >
                        -
                      </button>
                    </div>
                  </div>

                  {/* Text Transform */}
                  <div>
                    <label className="block text-sm mb-1">Text Transform</label>
                    <select
                      value={textCaps}
                      onChange={(e) =>
                        updateTextFormatting("Caps", e.target.value)
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="none">None</option>
                      <option value="uppercase">UPPERCASE</option>
                      <option value="lowercase">lowercase</option>
                      <option value="capitalize">Capitalize</option>
                    </select>
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-sm mb-1">Text Color</label>
                    <div
                      className="w-full h-8 border rounded cursor-pointer"
                      style={{ backgroundColor: selectedColor }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    />
                    {showColorPicker && (
                      <div className="absolute z-10 mt-2">
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowColorPicker(false)}
                        />
                        <SketchPicker
                          color={selectedColor}
                          onChange={(color) => {
                            setSelectedColor(color.hex);
                            updateSelectedElementStyle({
                              color: color.hex,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center - Main Canvas */}
          <div className="w-full md:w-2/4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="mb-4 flex space-x-2">
                <button
                  onClick={undo}
                  disabled={undoStack.length === 0}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Undo
                </button>
                <button
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Redo
                </button>
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  {isPreviewMode ? "Exit Preview" : "Preview"}
                </button>
              </div>

              <div
                ref={editorRef}
                className={`relative bg-white border border-gray-300 rounded w-full h-[600px] overflow-hidden ${
                  isPreviewMode ? "pointer-events-none" : ""
                }`}
                onClick={handleEditorClick}
                style={{
                  cursor: "text",
                  backgroundImage: backgroundImage
                    ? `url(${backgroundImage})`
                    : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {elements.map((element) => (
                  <div
                    key={element.id}
                    style={{
                      ...element.style,
                      border:
                        selectedElement?.id === element.id ||
                        editingElement?.id === element.id
                          ? "2px solid #3b82f6"
                          : "1px solid transparent",
                      borderRadius: "4px",
                      backgroundColor:
                        editingElement?.id === element.id
                          ? "rgba(59, 130, 246, 0.1)"
                          : "transparent",
                      position: "absolute",
                      userSelect: "none",
                    }}
                    onMouseDown={(e) => handleMouseDown(e, element)}
                    onDoubleClick={() => handleDoubleClick(element)}
                    className="relative group"
                  >
                    {element.type === "text" &&
                    editingElement?.id === element.id ? (
                      <textarea
                        value={element.content}
                        onChange={(e) => handleTextChange(e, element.id)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          fontSize: element.style.fontSize,
                          color: element.style.color,
                          width: "100%",
                          height: "100%",
                          resize: "none",
                          padding: "inherit",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div
                        style={{
                          padding: "4px",
                          cursor: "move",
                          pointerEvents: "auto",
                        }}
                      >
                        {element.type === "text" ? (
                          <span
                            style={{ whiteSpace: "pre-wrap" }}
                            draggable="True"
                          >
                            {element.content}
                          </span>
                        ) : (
                          <img
                            src={element.content}
                            alt="uploaded"
                            className="max-w-full h-auto"
                            draggable="True"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Actions */}
          <div className="w-full md:w-1/4 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow space-y-2">
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className={`w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {saving ? "Saving..." : "Save Template"}
              </button>

              <button
                onClick={exportTemplate}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Export as Image
              </button>

              {selectedElement && (
                <button
                  onClick={deleteSelectedElement}
                  className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
                >
                  Delete Selected Element
                </button>
              )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow mt-4">
              <h3 className="font-bold mb-3">Layers</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {elements
                  .slice()
                  .reverse()
                  .map((element, index) => (
                    <div
                      key={element.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                        selectedElement?.id === element.id
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setSelectedElement(element)}
                    >
                      <div className="flex items-center">
                        <span className="text-sm">
                          {element.type === "image"
                            ? `Image Layer ${elements.length - index}`
                            : `Text Layer ${elements.length - index}`}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayer(element.id, "up");
                          }}
                          className="p-1 text-gray-600 hover:text-blue-600"
                          disabled={index === 0}
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayer(element.id, "down");
                          }}
                          className="p-1 text-gray-600 hover:text-blue-600"
                          disabled={index === elements.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newElements = elements.filter(
                              (el) => el.id !== element.id
                            );
                            setElements(newElements);
                            if (selectedElement?.id === element.id) {
                              setSelectedElement(null);
                            }
                          }}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;