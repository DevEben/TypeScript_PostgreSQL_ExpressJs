import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { createPostController, viewOnePost, viewPosts, updatePost, deletePost, } from '../controllers/postController';
import { authenticate, Admin } from '../middleware/authentication';
import { upload } from '../middleware/multer';


const router = Router();

// Endpoint to create a post 
router.post("/createpost", upload.array("mediaFiles", 10), Admin, asyncHandler(createPostController));

//endpoint to view a post on the blog
router.get('/viewapost/:postId', asyncHandler(viewOnePost));

//endpoint to view all post on the blog
router.get('/viewposts', asyncHandler(viewPosts));

//endpoint to update a post on the blog
router.put('/updatepost/:postId', upload.array("mediaFiles", 10), Admin, asyncHandler(updatePost));

//endpoint to delete a post on the blog
router.delete('/deletepost/:postId', Admin, asyncHandler(deletePost));

export default router;