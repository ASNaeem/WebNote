const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Note = require('../src/models/Note');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
    }
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Note.deleteMany({});
});

describe('WebNote REST API endpoints', () => {
  test('GET /api/notes returns empty array initially', async () => {
    const response = await request(app)
      .get('/api/notes')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  test('POST /api/notes creates a new note successfully with defaults', async () => {
    const newNoteText = 'Buy groceries';
    const response = await request(app)
      .post('/api/notes')
      .send({ text: newNoteText })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.text).toBe(newNoteText);
    expect(response.body.isPinned).toBe(false);
    expect(response.body.color).toBe('default');
    expect(response.body.id).toBeDefined();

    // Verify it exists in database
    const notesInDb = await Note.find();
    expect(notesInDb.length).toBe(1);
    expect(notesInDb[0].text).toBe(newNoteText);
  });

  test('POST /api/notes creates a note with custom properties', async () => {
    const response = await request(app)
      .post('/api/notes')
      .send({ text: 'Important note', isPinned: true, color: 'green' })
      .expect(201);

    expect(response.body.text).toBe('Important note');
    expect(response.body.isPinned).toBe(true);
    expect(response.body.color).toBe('green');
  });

  test('POST /api/notes fails with 400 when text is empty', async () => {
    const response = await request(app)
      .post('/api/notes')
      .send({ text: '' })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  test('PUT /api/notes/:id updates an existing note text, pinning, and color', async () => {
    const note = await Note.create({ text: 'Original content', isPinned: false, color: 'default' });

    const response = await request(app)
      .put(`/api/notes/${note.id}`)
      .send({ text: 'Updated content', isPinned: true, color: 'purple' })
      .expect(200);

    expect(response.body.text).toBe('Updated content');
    expect(response.body.isPinned).toBe(true);
    expect(response.body.color).toBe('purple');

    // Verify change in DB
    const updatedNote = await Note.findById(note.id);
    expect(updatedNote.text).toBe('Updated content');
    expect(updatedNote.isPinned).toBe(true);
    expect(updatedNote.color).toBe('purple');
  });

  test('DELETE /api/notes/:id removes a note', async () => {
    const note = await Note.create({ text: 'To be deleted' });

    await request(app)
      .delete(`/api/notes/${note.id}`)
      .expect(200);

    const noteInDb = await Note.findById(note.id);
    expect(noteInDb).toBeNull();
  });
});
