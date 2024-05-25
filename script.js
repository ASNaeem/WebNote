document.addEventListener('DOMContentLoaded', () => {
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;
    const lightModeIcon = document.querySelector('.light-mode-icon');
    const darkModeIcon = document.querySelector('.dark-mode-icon');

    function toggleTheme(theme) {
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

    const currentTheme = localStorage.getItem('theme') || 'light';
    toggleTheme(currentTheme);

    themeToggleButton.addEventListener('click', () => {
        const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        toggleTheme(newTheme);
    });
});

let editIndex = -1;

document.getElementById('add-note').addEventListener('click', () => {
    addUpdate();
});
document.getElementById('note-text').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addUpdate();
    }
});

function addUpdate() {
    const noteTexts = document.getElementById('note-text');
    if (!noteTexts.value.trim()) {
        alert('Note cannot be empty!');
        return;
    }

    const button = document.getElementById('add-note');

    if (button.textContent === 'Add Note' && noteTexts.value.trim()) {
        addNote(noteTexts.value.trim());
        saveToLocal();
    } else if (button.textContent === 'Update Note') {
        const notes = document.querySelectorAll('.note p');
        notes[editIndex].textContent = noteTexts.value;
        editIndex = -1;
        button.textContent = 'Add Note';
        saveToLocal();
    }
    document.getElementById('note-text').value = '';
}

function addNote(noteText) {
    const noteTextContainer = document.getElementById('note-text');
    const notesContainer = document.getElementById('notes-container');

    const noteElement = document.createElement('div');
    const noteContent = document.createElement('p');
    const deleteButton = document.createElement('button');
    const editButton = document.createElement('button');
    const buttonsContainer = document.createElement('div');

    buttonsContainer.classList.add('note-buttons');

    noteElement.classList.add('note');
    noteContent.textContent = noteText;
    noteElement.appendChild(noteContent);

    editButton.classList.add('edit');
    deleteButton.classList.add('delete');

    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    
    deleteButton.addEventListener('click', () => {
        noteElement.remove();
        saveToLocal();
    });

    editButton.addEventListener('click', () => {
        noteTextContainer.value = noteContent.textContent;
        document.getElementById('add-note').textContent = 'Update Note';
        editIndex = Array.from(document.querySelectorAll('.note')).indexOf(noteElement);
        document.querySelector('#note-text').focus();

    });

    buttonsContainer.appendChild(editButton);
    buttonsContainer.appendChild(deleteButton);

    noteElement.appendChild(buttonsContainer);
    notesContainer.appendChild(noteElement);
}

function saveToLocal() {
    const notes = [];
    document.querySelectorAll('.note p').forEach(note => {
        notes.push(note.textContent);
    });
    localStorage.setItem('notes', JSON.stringify(notes));
}

function loadFromLocal() {
    const notes = JSON.parse(localStorage.getItem('notes'));
    if (notes) {
        notes.forEach(noteText => addNote(noteText));
    }
}

document.addEventListener('DOMContentLoaded', loadFromLocal);
