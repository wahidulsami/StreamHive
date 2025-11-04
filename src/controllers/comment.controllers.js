import mongoose from "mongoose";
import { Comment } from "../models/Comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const getVideoComments = asyncHandler(async (req , res) => {
    const {videoId} = req.params
    const {page = 1 , limit =10} = req.query

    if(!videoId ||  !mongoose.Types.ObjectId.isValid(videoId) ){
       return res.status(400).json({ success: false, message: "Invalid video ID" });
    }

    const commentQuery = Comment.aggregate([
  {
        $match: { video: videoId }
  },
  { $sort: { createdAt: -1 } },
  {
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [{ $project: { username: 1, avatar: 1, _id: 1 } }]
    }
  },
  { $unwind: "$owner" },
  {
    $lookup: {
      from: "comments",
      localField: "_id",
      foreignField: "parentComment",
      as: "replies",
      pipeline: [
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline: [{ $project: { username: 1, avatar: 1, _id: 1 } }]
          }
        },
        { $unwind: "$owner" }
      ]
    }
  }
]);

    const paginate = await Comment.aggregatePaginate(commentQuery ,{
        page: parseInt(page),
        limit: parseInt(limit)
    })
return res
.status(200)
.json({
    success:true,
    ...paginate,
      message: "Comments (with replies) fetched successfully",
})

})

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content, parentCommentId } = req.body;

  if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ success: false, message: "Invalid video ID" });
  }
  if (!content?.trim()) {
    return res.status(400).json({ success: false, message: "Content is required" });
  }

  
  let parentComment = null;
  if (parentCommentId) {
    if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
      return res.status(400).json({ success: false, message: "Invalid parent comment ID" });
    }
    parentComment = parentCommentId;
  }

  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
    parentComment,
  });

  const populatedComment = await Comment.findById(newComment._id)
    .populate("owner", "username avatar _id");

  return res.status(200).json({
    success: true,
    data: populatedComment,
    message: parentComment
      ? "Reply added successfully"
      : "Comment created successfully",
  });
});


const  updateComment = asyncHandler(async (req , res) => {
    const {commentId} = req.params
    const {content} = req.body

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ success: false, message: "Invalid comment ID" });
    }

    const existComment = await Comment.findById(commentId)
    
    if (!existComment) {
        return res.status(404).json({
            success:false,
            message:"comment not found"
        })
    }
    if(existComment.owner.toString() !== req.user._id.toString()){
      return res.status(403).json({ success: false, message: "You are not authorized to update this comment" });
    }

 const newComment = await Comment.findByIdAndUpdate(
  commentId,
  { content },
  { new: true }
).populate("owner", "username avatar");

    if (!newComment) {
        return res.status(500).json({ success: false, message: "Failed to update comment" });
    }

    return res 
    .status(200)
    .json( {
        success:true,
        data:newComment,
        message:"comment updated successfully"
    })

})

const deleteComments = asyncHandler(async (req , res )=> {
    const {commentId} = req.params;
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ success: false, message: "Invalid comment ID" });
    }

    const existComment = await Comment.findById(commentId)

    if (!existComment) {
    return res.status(404).json({ success: false, message: "Comment not found" });
    }

    if (existComment.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "You are not authorized to delete this comment" });
    }
  
    const deleteComment = await  Comment.findByIdAndDelete(commentId)
      if (!deleteComment) {
        return res.status(500).json({ success: false, message: "Failed to delete comment" });
  }
  return res
    .status(200)
    .json({
        success:true,
        data:deleteComment,
        message:"comment deleted successfully"
    })
})



export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComments
}