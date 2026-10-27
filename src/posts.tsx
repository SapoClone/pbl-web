import axios from "axios"
import { axiosClient } from "@/api/axios"

export type PostType = {
  id: string
  title: string
  body: string
}

type PostApiResponse = {
  id: string
  title: string
  description?: string
  content?: string
}

type PostListResponse = {
  data: PostApiResponse[]
}

const toPost = (post: PostApiResponse): PostType => ({
  id: post.id,
  title: post.title,
  body: post.content ?? post.description ?? ""
})

export class PostNotFoundError extends Error {}

export const fetchPost = async (postId: string) => {
  const post = await axiosClient
    .get<PostApiResponse>(`/posts/${postId}`)
    .then((r) => toPost(r.data))
    .catch((err) => {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new PostNotFoundError(`Post with id "${postId}" not found!`)
      }
      throw err
    })

  return post
}

export const fetchPosts = async () => {
  return axiosClient
    .get<PostListResponse>("/posts")
    .then((r) => r.data.data.map(toPost))
}
