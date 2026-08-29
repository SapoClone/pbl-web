import { FileRoute, Link, Outlet } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { postsQueryOptions } from "../api/tanstack-query/postsQueryOptions"

export const Route = new FileRoute("/posts").createRoute({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(postsQueryOptions),
  component: PostsComponent
})

function PostsComponent() {
  const postsQuery = useSuspenseQuery(postsQueryOptions)
  const posts = postsQuery.data

  return (
    <div className="flex gap-2 p-2">
      <ul className="list-disc pl-4">
        {[...posts, { id: "i-do-not-exist", title: "Non-existent Post" }]?.map(
          (post) => {
            return (
              <li key={post.id} className="whitespace-nowrap">
                <Link
                  to="/posts/$postId"
                  params={{
                    postId: post.id
                  }}
                  className="block py-1 text-blue-800 hover:text-blue-600"
                  activeProps={{ className: "text-black font-bold" }}
                >
                  <div>{post.title.substring(0, 20)}</div>
                </Link>
              </li>
            )
          }
        )}
      </ul>
      <hr />
      <Outlet />
    </div>
  )
}
