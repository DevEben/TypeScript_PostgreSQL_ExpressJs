import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { likePost, sharePost, } from '../controllers/like&ShareController';
import { authenticate, Admin } from '../middleware/authentication';
import { upload } from '../middleware/multer';

const router = Router();

//endpoint to like a post on the blog
router.post('/posts/like/:postId/', asyncHandler(authenticate), asyncHandler(likePost));

//endpoint to share a post on the blog
router.post('/posts/share/:postId/', asyncHandler(authenticate), asyncHandler(sharePost));


export default router;