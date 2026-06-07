import Task from '../models/Task.js';

export const getTasks = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 6 } = req.query;
    const filter = { userId: req.user.id };
    if (status && status !== 'all') filter.status = status;
    if (search?.trim()) filter.title = { $regex: search.trim(), $options: 'i' };

    const total = await Task.countDocuments(filter);
    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ tasks, total, pages: Math.ceil(total / Number(limit)), page: Number(page) });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const task = await Task.create({ title: title.trim(), description, userId: req.user.id });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { title, description, status } = req.body;
    const update = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description;
    if (status !== undefined) update.status = status;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};
