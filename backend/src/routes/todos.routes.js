const express = require('express');
const router = express.Router();
const {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  bulkUpdateTodos
} = require('../controllers/todos.controller');
const authenticateUser = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateUser);

/**
 * @route   GET /api/todos
 * @desc    Get all todos for authenticated user
 * @access  Private
 */
router.get('/', getTodos);

/**
 * @route   POST /api/todos
 * @desc    Create a new todo
 * @access  Private
 */
router.post('/', createTodo);

/**
 * @route   PUT /api/todos/:id
 * @desc    Update a todo
 * @access  Private
 */
router.put('/:id', updateTodo);

/**
 * @route   DELETE /api/todos/:id
 * @desc    Delete a todo (soft delete)
 * @access  Private
 */
router.delete('/:id', deleteTodo);

/**
 * @route   PATCH /api/todos/bulk
 * @desc    Bulk update todos (for reordering or batch operations)
 * @access  Private
 */
router.patch('/bulk', bulkUpdateTodos);

module.exports = router;





