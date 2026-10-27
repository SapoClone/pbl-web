import { Route as rootRoute } from './routes/__root'
import { Route as UsersImport } from './routes/users'
import { Route as SuppliersImport } from './routes/suppliers'
import { Route as StaffImport } from './routes/staff'
import { Route as SettingsImport } from './routes/settings'
import { Route as ReportsImport } from './routes/reports'
import { Route as RegisterImport } from './routes/register'
import { Route as ProductsImport } from './routes/products'
import { Route as PostsImport } from './routes/posts'
import { Route as PosImport } from './routes/pos'
import { Route as OrdersImport } from './routes/orders'
import { Route as LoginImport } from './routes/login'
import { Route as InventoryImport } from './routes/inventory'
import { Route as ForgotPasswordImport } from './routes/forgot-password'
import { Route as CustomersImport } from './routes/customers'
import { Route as ChannelsImport } from './routes/channels'
import { Route as IndexImport } from './routes'
import { Route as PostsPostIdImport } from './routes/posts.$postId'
import { Route as PostsPostIdDeepImport } from './routes/posts.$postId.deep'

const UsersRoute = UsersImport.update({
  path: '/users',
  getParentRoute: () => rootRoute,
} as any)

const SuppliersRoute = SuppliersImport.update({
  path: '/suppliers',
  getParentRoute: () => rootRoute,
} as any)

const StaffRoute = StaffImport.update({
  path: '/staff',
  getParentRoute: () => rootRoute,
} as any)

const SettingsRoute = SettingsImport.update({
  path: '/settings',
  getParentRoute: () => rootRoute,
} as any)

const ReportsRoute = ReportsImport.update({
  path: '/reports',
  getParentRoute: () => rootRoute,
} as any)

const RegisterRoute = RegisterImport.update({
  path: '/register',
  getParentRoute: () => rootRoute,
} as any)

const ProductsRoute = ProductsImport.update({
  path: '/products',
  getParentRoute: () => rootRoute,
} as any)

const PostsRoute = PostsImport.update({
  path: '/posts',
  getParentRoute: () => rootRoute,
} as any)

const PosRoute = PosImport.update({
  path: '/pos',
  getParentRoute: () => rootRoute,
} as any)

const OrdersRoute = OrdersImport.update({
  path: '/orders',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const InventoryRoute = InventoryImport.update({
  path: '/inventory',
  getParentRoute: () => rootRoute,
} as any)

const ForgotPasswordRoute = ForgotPasswordImport.update({
  path: '/forgot-password',
  getParentRoute: () => rootRoute,
} as any)

const CustomersRoute = CustomersImport.update({
  path: '/customers',
  getParentRoute: () => rootRoute,
} as any)

const ChannelsRoute = ChannelsImport.update({
  path: '/channels',
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
  path: '/deep',
  getParentRoute: () => PostsPostIdRoute,
} as any)
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/channels': {
      preLoaderRoute: typeof ChannelsImport
      parentRoute: typeof rootRoute
    }
    '/customers': {
      preLoaderRoute: typeof CustomersImport
      parentRoute: typeof rootRoute
    }
    '/forgot-password': {
      preLoaderRoute: typeof ForgotPasswordImport
      parentRoute: typeof rootRoute
    }
    '/inventory': {
      preLoaderRoute: typeof InventoryImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/orders': {
      preLoaderRoute: typeof OrdersImport
      parentRoute: typeof rootRoute
    }
    '/pos': {
      preLoaderRoute: typeof PosImport
      parentRoute: typeof rootRoute
    }
    '/posts': {
      preLoaderRoute: typeof PostsImport
      parentRoute: typeof rootRoute
    }
    '/products': {
      preLoaderRoute: typeof ProductsImport
      parentRoute: typeof rootRoute
    }
    '/register': {
      preLoaderRoute: typeof RegisterImport
      parentRoute: typeof rootRoute
    }
    '/reports': {
      preLoaderRoute: typeof ReportsImport
      parentRoute: typeof rootRoute
    }
    '/settings': {
      preLoaderRoute: typeof SettingsImport
      parentRoute: typeof rootRoute
    }
    '/staff': {
      preLoaderRoute: typeof StaffImport
      parentRoute: typeof rootRoute
    }
    '/suppliers': {
      preLoaderRoute: typeof SuppliersImport
      parentRoute: typeof rootRoute
    }
    '/users': {
      preLoaderRoute: typeof UsersImport
      parentRoute: typeof rootRoute
    }
    '/posts/$postId': {
      preLoaderRoute: typeof PostsPostIdImport
      parentRoute: typeof PostsImport
    }
    '/posts/$postId/deep': {
      preLoaderRoute: typeof PostsPostIdDeepImport
      parentRoute: typeof PostsPostIdImport
    }
  }
}
export const routeTree = rootRoute.addChildren([
  IndexRoute,
  ChannelsRoute,
  CustomersRoute,
  ForgotPasswordRoute,
  InventoryRoute,
  LoginRoute,
  OrdersRoute,
  PosRoute,
  PostsRoute.addChildren([
    PostsPostIdRoute.addChildren([PostsPostIdDeepRoute]),
  ]),
  ProductsRoute,
  RegisterRoute,
  ReportsRoute,
  SettingsRoute,
  StaffRoute,
  SuppliersRoute,
  UsersRoute,
])
