import express from 'express';
import {
  getReels,
  createReel,
  likeReel,
  saveReel,
  addComment,
  reorderReels,
  deleteReel,
  loveComment,
  editComment,
  deleteComment,
} from '../controllers/reelsController.js';

const router = express.Router();

router.get('/', getReels);
router.delete('/:id', deleteReel);
router.post('/', createReel);
router.post('/:id/like', likeReel);
router.post('/:id/save', saveReel);
router.post('/:id/comment', addComment);
router.patch('/reorder', reorderReels);
router.post('/:reelId/comment/:commentId/love', loveComment); // consistent with controller
router.patch('/:reelId/comment/:commentId', editComment);
router.delete('/:reelId/comment/:commentId', deleteComment);
// routes/reels.js


export default router;
