import { FileRoute, Link } from "@tanstack/react-router"

export const Route = new FileRoute('/').createRoute({
  component: Home
})

function Home() {
  return (
    <div className="space-y-5 p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">PBL / Community</p>
      <h3 className="font-serif text-4xl text-slate-900">Welcome home.</h3>
      <div className="flex flex-wrap gap-3">
        <Link to="/login" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Sign in
        </Link>
        <Link to="/register" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          Create account
        </Link>
        <Link to="/posts" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          Browse posts
        </Link>
      </div>
    </div>
  )
}
