const express = require('express');
const router = express.Router();
const Note = require('../models/Note');

// @desc    Get all notes
// @route   GET /api/notes
router.get('/', async (req, res, next) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// @desc    Create a note
// @route   POST /api/notes
router.post('/', async (req, res, next) => {
  try {
    const { text, isPinned, color } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text cannot be empty' });
    }
    const newNote = await Note.create({ text, isPinned, color });
    res.status(201).json(newNote);
  } catch (error) {
    next(error);
  }
});

// @desc    Update a note by ID
// @route   PUT /api/notes/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { text, isPinned, color } = req.body;
    const updateData = {};
    if (text !== undefined) {
      if (!text.trim()) {
        return res.status(400).json({ error: 'Note text cannot be empty' });
      }
      updateData.text = text;
    }
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (color !== undefined) updateData.color = color;

    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(updatedNote);
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a note by ID
// @route   DELETE /api/notes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
