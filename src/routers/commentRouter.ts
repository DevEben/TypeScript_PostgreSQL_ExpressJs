import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { commentPost, viewComments, deleteComment, } from '../controllers/commentController';
import { authenticate, Admin } from '../middleware/authentication';
import { upload } from '../middleware/multer';

const router = Router();

//endpoint to add comment to a post on the blog
router.post('/comments/:postId/', asyncHandler(authenticate), asyncHandler(commentPost));

//endpoint to view comments to a post on the blog
router.get('/viewcomments/:postId/', asyncHandler(authenticate), asyncHandler(viewComments));

//endpoint to delete a comments to a post on the blog
router.delete('/deletecomments/:postId/:commentId', asyncHandler(authenticate), asyncHandler(deleteComment));


export default router;