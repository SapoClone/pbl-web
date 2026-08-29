import { Route as rootRoute } from './routes/__root'
import { Route as PostsImport } from './routes/posts'
import { Route as IndexImport } from './routes'
import { Route as PostsPostIdImport } from './routes/posts.$postId'
import { Route as PostsPostIdDeepImport } from './routes/posts_.$postId.deep'

const PostsRoute = PostsImport.update({
  path: '/posts',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const PostsPostIdRoute = PostsPostIdImport.update({
  path: '/$postId',
  getParentRoute: () => PostsRoute,
} as any)

const PostsPostIdDeepRoute = PostsPostIdDeepImport.update({
  path: '/posts/$postId/deep',
  getParentRoute: () => rootRoute,
} as any)
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/posts': {
      preLoaderRoute: typeof PostsImport
      parentRoute: typeof rootRoute
    }
    '/posts/$postId': {
      preLoaderRoute: typeof PostsPostIdImport
      parentRoute: typeof PostsImport
    }
    '/posts/$postId/deep': {
      preLoaderRoute: typeof PostsPostIdDeepImport
      parentRoute: typeof rootRoute
    }
  }
}
export const routeTree = rootRoute.addChildren([
  IndexRoute,
  PostsRoute.addChildren([PostsPostIdRoute]),
  PostsPostIdDeepRoute,
])
