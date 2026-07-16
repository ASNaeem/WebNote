document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupLayout();
  setupCharacterCounter();
  setupColorSelectionChange();
  setupSearch();
  loadNotes();
  setupEventListeners();
});

// App State
let activeEditNoteId = null;
let inputIsPinned = false;
let allNotes = []; // Client-side cache for real-time search
const API_URL = '/api/notes';
let useLocalStorageFallback = false;

// Theme Management
function setupTheme() {
  const themeToggleButton = document.getElementById('theme-toggle');
  const body = document.body;
  const lightModeIcon = document.querySelector('.light-mode-icon');
  const darkModeIcon = document.querySelector('.dark-mode-icon');

  function applyTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (theme === 'dark') {
      lightModeIcon.style.display = 'inline';
      darkModeIcon.style.display = 'none';
    } else {
      lightModeIcon.style.display = 'none';
      darkModeIcon.style.display = 'inline';
    }
  }

  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  themeToggleButton.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  });
}

// Layout Management (Grid/List View)
function setupLayout() {
  const layoutToggleButton = document.getElementById('layout-toggle');
  const pinnedContainer = document.getElementById('pinned-notes-container');
  const othersContainer = document.getElementById('notes-container');

  function applyLayout(view) {
    if (view === 'list') {
      pinnedContainer.classList.replace('grid-view', 'list-view');
      othersContainer.classList.replace('grid-view', 'list-view');
      localStorage.setItem('layoutView', 'list');
    } else {
      pinnedContainer.classList.replace('list-view', 'grid-view');
      othersContainer.classList.replace('list-view', 'grid-view');
      localStorage.setItem('layoutView', 'grid');
    }
  }

  const savedLayout = localStorage.getItem('layoutView') || 'grid';
  applyLayout(savedLayout);

  layoutToggleButton.addEventListener('click', () => {
    const isCurrentGrid = othersContainer.classList.contains('grid-view');
    applyLayout(isCurrentGrid ? 'list' : 'grid');
  });
}

// Character Counter
function setupCharacterCounter() {
  const textarea = document.getElementById('note-text');
  const counter = document.getElementById('char-counter');
  
  textarea.addEventListener('input', () => {
    const length = textarea.value.length;
    counter.textContent = `${length} / 250`;
    
    // Warning styling when close to limit
    if (length >= 220) {
      counter.style.color = '#ef4444';
    } else {
      counter.style.color = 'var(--text-muted)';
    }
  });
}

// Visual color shift on creation card when selecting another color option
function setupColorSelectionChange() {
  const inputCard = document.querySelector('.note-input-card');
  const radios = document.getElementsByName('note-color');
  
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      // Clear previous classes
      inputCard.className = 'note-input-card';
      // Add color specific class
      if (e.target.value !== 'default') {
        inputCard.classList.add(`note-${e.target.value}`);
      }
    });
  });
}

// Reset color selector to default
function resetColorSelector() {
  const inputCard = document.querySelector('.note-input-card');
  inputCard.className = 'note-input-card';
  
  const defaultRadio = document.querySelector('input[name="note-color"][value="default"]');
  if (defaultRadio) defaultRadio.checked = true;
}

// Real-time Search
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderNotes(allNotes);
      return;
    }

    const filtered = allNotes.filter(note => 
      note.text.toLowerCase().includes(term)
    );
    renderNotes(filtered);
  });
}

// Event Listeners setup
function setupEventListeners() {
  const addNoteButton = document.getElementById('add-note');
  const noteTextInput = document.getElementById('note-text');
  const pinToggleBtn = document.getElementById('pin-toggle-btn');
  const checklistHelperBtn = document.getElementById('checklist-helper-btn');

  addNoteButton.addEventListener('click', handleAddOrUpdateNote);

  noteTextInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent standard newline if Enter is pressed without Shift
      handleAddOrUpdateNote();
    }
  });

  // Creation card pin toggle
  pinToggleBtn.addEventListener('click', () => {
    inputIsPinned = !inputIsPinned;
    if (inputIsPinned) {
      pinToggleBtn.classList.add('active');
    } else {
      pinToggleBtn.classList.remove('active');
    }
  });

  // Checklist helper button to insert todo box template prefix
  checklistHelperBtn.addEventListener('click', () => {
    const startPos = noteTextInput.selectionStart;
    const endPos = noteTextInput.selectionEnd;
    const text = noteTextInput.value;
    
    // Prefix to insert: if it's the start of textarea or after a newline, just insert "- [ ] "
    // otherwise prefix it with a newline first: "\n- [ ] "
    const prefix = (startPos === 0 || text.charAt(startPos - 1) === '\n') ? '- [ ] ' : '\n- [ ] ';
    
    noteTextInput.value = text.substring(0, startPos) + prefix + text.substring(endPos);
    
    // Put focus back and move cursor to end of inserted prefix
    noteTextInput.focus();
    const newCursorPos = startPos + prefix.length;
    noteTextInput.setSelectionRange(newCursorPos, newCursorPos);
    
    // Update character count
    const counter = document.getElementById('char-counter');
    counter.textContent = `${noteTextInput.value.length} / 250`;
    if (noteTextInput.value.length >= 220) {
      counter.style.color = '#ef4444';
    } else {
      counter.style.color = 'var(--text-muted)';
    }
  });
}

// Fetch notes from backend API
async function loadNotes() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to load notes');
    allNotes = await response.json();
    useLocalStorageFallback = false;
  } catch (error) {
    console.warn('Backend database API not available. Falling back to local browser storage:', error);
    useLocalStorageFallback = true;
    const localData = localStorage.getItem('webnotes');
    allNotes = localData ? JSON.parse(localData) : [];
  }
  
  // Clear search filter when reloading
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  renderNotes(allNotes);
}

// Render list of notes (segregating Pinned and Others)
function renderNotes(notes) {
  const pinnedContainer = document.getElementById('pinned-notes-container');
  const othersContainer = document.getElementById('notes-container');
  const pinnedHeading = document.getElementById('pinned-heading');
  const othersHeading = document.getElementById('notes-heading');
  const emptyState = document.getElementById('empty-state');

  pinnedContainer.innerHTML = '';
  othersContainer.innerHTML = '';

  const pinnedNotes = notes.filter(n => n.isPinned);
  const otherNotes = notes.filter(n => !n.isPinned);

  // Toggle empty state
  if (notes.length === 0) {
    emptyState.style.display = 'flex';
    pinnedHeading.style.display = 'none';
    othersHeading.style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';

  // Render Pinned
  if (pinnedNotes.length > 0) {
    pinnedHeading.style.display = 'flex';
    pinnedNotes.forEach(note => {
      appendNoteToContainer(note, pinnedContainer);
    });
  } else {
    pinnedHeading.style.display = 'none';
  }

  // Render Others
  if (otherNotes.length > 0) {
    // Only show heading if we also have pinned notes to differentiate
    othersHeading.style.display = pinnedNotes.length > 0 ? 'flex' : 'none';
    otherNotes.forEach(note => {
      appendNoteToContainer(note, othersContainer);
    });
  } else {
    othersHeading.style.display = 'none';
  }
}

// Append note card to container
function appendNoteToContainer(note, container) {
  const noteElement = document.createElement('div');
  noteElement.className = `note note-${note.color || 'default'}`;
  if (note.isPinned) {
    noteElement.classList.add('is-pinned');
  }
  noteElement.setAttribute('data-id', note.id);

  // Pin indicator toggle button on card
  const pinBtn = document.createElement('button');
  pinBtn.className = 'note-pin-indicator';
  pinBtn.innerHTML = '<i class="fa-solid fa-thumbtack"></i>';
  pinBtn.title = note.isPinned ? 'Unpin Note' : 'Pin Note';
  pinBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await togglePinStatus(note.id, !note.isPinned);
  });
  noteElement.appendChild(pinBtn);

  // Note Text / Checklist Parsing
  const lines = note.text.split('\n');
  const hasCheckboxes = lines.some(line => /^\s*-\s*\[([ xX])\]\s*(.*)$/.test(line));

  if (hasCheckboxes) {
    const listElement = document.createElement('ul');
    listElement.className = 'note-checklist';

    lines.forEach((line, lineIndex) => {
      const match = line.match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const itemText = match[2];

        const itemElement = document.createElement('li');
        itemElement.className = 'checklist-item';
        if (isChecked) {
          itemElement.classList.add('todo-completed');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checklist-checkbox';
        checkbox.checked = isChecked;
        
        const label = document.createElement('span');
        label.className = 'checklist-label';
        label.textContent = itemText;

        // Toggle checkbox on click
        checkbox.addEventListener('change', async (e) => {
          e.stopPropagation();
          await handleCheckboxToggle(note, lineIndex, checkbox.checked);
        });

        // Toggle when clicking label
        label.addEventListener('click', async (e) => {
          e.stopPropagation();
          checkbox.checked = !checkbox.checked;
          await handleCheckboxToggle(note, lineIndex, checkbox.checked);
        });

        itemElement.appendChild(checkbox);
        itemElement.appendChild(label);
        listElement.appendChild(itemElement);
      } else if (line.trim().length > 0) {
        // If it's a plain text line mixed in a checklist note, render it as a list item text
        const itemElement = document.createElement('li');
        itemElement.className = 'checklist-item-text';
        itemElement.style.paddingLeft = '1.5rem';
        itemElement.style.marginBottom = '0.4rem';
        itemElement.style.fontSize = '0.95rem';
        itemElement.style.color = 'var(--text-main)';
        itemElement.textContent = line;
        listElement.appendChild(itemElement);
      }
    });
    noteElement.appendChild(listElement);
  } else {
    const noteContent = document.createElement('p');
    noteContent.className = 'note-text';
    noteContent.textContent = note.text;
    noteElement.appendChild(noteContent);
  }

  // Note Footer
  const footerElement = document.createElement('div');
  footerElement.className = 'note-footer';

  // Date and Time
  const timeElement = document.createElement('span');
  timeElement.className = 'note-time';
  timeElement.textContent = formatNoteTimestamp(note.updatedAt || note.createdAt);
  footerElement.appendChild(timeElement);

  // Card Actions
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'note-card-actions';

  const copyBtn = createCopyButton(note.text);
  const editBtn = createEditButton(note);
  const deleteBtn = createDeleteButton(note.id);

  actionsContainer.appendChild(copyBtn);
  actionsContainer.appendChild(editBtn);
  actionsContainer.appendChild(deleteBtn);
  footerElement.appendChild(actionsContainer);

  noteElement.appendChild(footerElement);
  container.appendChild(noteElement);
}

// Date formatter
function formatNoteTimestamp(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Toggle Pin Status via API
async function togglePinStatus(noteId, newPinStatus) {
  if (useLocalStorageFallback) {
    allNotes = allNotes.map(n => n.id === noteId ? { ...n, isPinned: newPinStatus } : n);
    saveToLocalStorage();
    renderNotes(allNotes);
    return;
  }
  try {
    const response = await fetch(`${API_URL}/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isPinned: newPinStatus }),
    });
    if (!response.ok) throw new Error('Failed to pin/unpin note');
    loadNotes(); // Reload layout
  } catch (error) {
    console.error('Error toggling pin status:', error);
    alert('Failed to update note pin status.');
  }
}

// Create Card Copy Action
function createCopyButton(text) {
  const copyBtn = document.createElement('button');
  copyBtn.className = 'card-action-btn copy-btn';
  copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
  copyBtn.title = 'Copy to Clipboard';

  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-color);"></i>';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
      }, 1500);
    } catch (err) {
      console.error('Could not copy text:', err);
    }
  });

  return copyBtn;
}

// Create Card Edit Action
function createEditButton(note) {
  const editBtn = document.createElement('button');
  editBtn.className = 'card-action-btn edit-btn';
  editBtn.innerHTML = '<i class="fa-regular fa-pen-to-square"></i>';
  editBtn.title = 'Edit Note';

  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const noteTextInput = document.getElementById('note-text');
    const addNoteButton = document.getElementById('add-note');
    const pinToggleBtn = document.getElementById('pin-toggle-btn');
    const inputCard = document.querySelector('.note-input-card');

    noteTextInput.value = note.text;
    addNoteButton.textContent = 'Update Note';
    activeEditNoteId = note.id;

    // Set checkmark color picker state
    const colorRadio = document.querySelector(`input[name="note-color"][value="${note.color || 'default'}"]`);
    if (colorRadio) {
      colorRadio.checked = true;
      inputCard.className = 'note-input-card';
      if (note.color && note.color !== 'default') {
        inputCard.classList.add(`note-${note.color}`);
      }
    }

    // Set checkmark pin state
    inputIsPinned = note.isPinned;
    if (inputIsPinned) {
      pinToggleBtn.classList.add('active');
    } else {
      pinToggleBtn.classList.remove('active');
    }

    // Focus input and update counter
    noteTextInput.focus();
    const counter = document.getElementById('char-counter');
    counter.textContent = `${note.text.length} / 250`;
  });

  return editBtn;
}

// Create Card Delete Action
function createDeleteButton(noteId) {
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-action-btn delete-btn';
  deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
  deleteBtn.title = 'Delete Note';

  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('Delete this note permanently?')) {
      if (useLocalStorageFallback) {
        allNotes = allNotes.filter(n => n.id !== noteId);
        saveToLocalStorage();
        renderNotes(allNotes);
      } else {
        const deleted = await deleteNoteOnServer(noteId);
        if (deleted) {
          loadNotes();
        }
      }
    }
  });

  return deleteBtn;
}

// API Calls
async function deleteNoteOnServer(noteId) {
  try {
    const response = await fetch(`${API_URL}/${noteId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete note');
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Failed to delete note.');
    return false;
  }
}

async function handleAddOrUpdateNote() {
  const noteTextInput = document.getElementById('note-text');
  const text = noteTextInput.value.trim();

  if (!text) {
    alert('Note cannot be empty!');
    return;
  }

  const addNoteButton = document.getElementById('add-note');
  const pinToggleBtn = document.getElementById('pin-toggle-btn');
  
  // Get color selection
  const selectedColorRadio = document.querySelector('input[name="note-color"]:checked');
  const color = selectedColorRadio ? selectedColorRadio.value : 'default';

  if (useLocalStorageFallback) {
    if (activeEditNoteId) {
      // Update Mode
      allNotes = allNotes.map(n => n.id === activeEditNoteId ? { 
        ...n, 
        text, 
        isPinned: inputIsPinned, 
        color,
        updatedAt: new Date().toISOString() 
      } : n);
      activeEditNoteId = null;
      addNoteButton.textContent = 'Add Note';
    } else {
      // Add Mode
      const newNote = {
        id: Date.now().toString(),
        text,
        isPinned: inputIsPinned,
        color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      allNotes.unshift(newNote);
    }
    saveToLocalStorage();
    resetCreateCardState(noteTextInput, pinToggleBtn);
    renderNotes(allNotes);
    return;
  }

  if (activeEditNoteId) {
    // Update Mode
    const updated = await updateNoteOnServer(activeEditNoteId, text, inputIsPinned, color);
    if (updated) {
      activeEditNoteId = null;
      addNoteButton.textContent = 'Add Note';
      resetCreateCardState(noteTextInput, pinToggleBtn);
      loadNotes();
    }
  } else {
    // Add Mode
    const saved = await createNoteOnServer(text, inputIsPinned, color);
    if (saved) {
      resetCreateCardState(noteTextInput, pinToggleBtn);
      loadNotes();
    }
  }
}

function resetCreateCardState(inputElement, pinButton) {
  inputElement.value = '';
  inputIsPinned = false;
  pinButton.classList.remove('active');
  resetColorSelector();
  
  const counter = document.getElementById('char-counter');
  counter.textContent = '0 / 250';
  counter.style.color = 'var(--text-muted)';
}

async function createNoteOnServer(text, isPinned, color) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, isPinned, color }),
    });
    if (!response.ok) throw new Error('Failed to save note');
    return await response.json();
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Failed to save note.');
    return null;
  }
}

async function updateNoteOnServer(noteId, text, isPinned, color) {
  try {
    const response = await fetch(`${API_URL}/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, isPinned, color }),
    });
    if (!response.ok) throw new Error('Failed to update note');
    return await response.json();
  } catch (error) {
    console.error('Error updating note:', error);
    alert('Failed to update note.');
    return null;
  }
}

// Toggle Checkbox Item Wording dynamically and update database Note
async function handleCheckboxToggle(note, lineIndex, isChecked) {
  const lines = note.text.split('\n');
  const match = lines[lineIndex].match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
  if (match) {
    const checkChar = isChecked ? 'x' : ' ';
    lines[lineIndex] = `- [${checkChar}] ${match[2]}`;
    const newText = lines.join('\n');

    if (useLocalStorageFallback) {
      note.text = newText;
      const cachedNote = allNotes.find(n => n.id === note.id);
      if (cachedNote) {
        cachedNote.text = newText;
        cachedNote.updatedAt = new Date().toISOString();
      }
      saveToLocalStorage();
      renderNotes(allNotes);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newText }),
      });
      if (!response.ok) throw new Error('Failed to update checkbox item');
      
      // Update local state caches
      note.text = newText;
      const cachedNote = allNotes.find(n => n.id === note.id);
      if (cachedNote) cachedNote.text = newText;
      
      renderNotes(allNotes);
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      alert('Failed to update checklist item on server.');
      loadNotes(); // Reload to rollback UI state
    }
  }
}

function saveToLocalStorage() {
  localStorage.setItem('webnotes', JSON.stringify(allNotes));
}
