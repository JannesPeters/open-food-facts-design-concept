import { BadgeCheck, CircleUserRound, LogIn, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader, { HeaderBackButton } from '@/components/SiteHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { clearSessionUser, useSessionUser } from '@/lib/sessionUser'

function ProfilePage() {
  const navigate = useNavigate()
  const sessionUser = useSessionUser()

  const handleSignOut = () => {
    clearSessionUser()
    navigate('/')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<HeaderBackButton />} showLoginAction={false} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10">
        <Card className="mx-auto w-full max-w-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CircleUserRound className="size-6 text-primary" />
              Your profile
            </CardTitle>
            <CardDescription>
              A simple signed-in profile for this design concept.
            </CardDescription>
          </CardHeader>

          {sessionUser ? (
            <>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="gap-1">
                    <BadgeCheck className="size-3.5" />
                    Signed in
                  </Badge>
                </div>
                <dl className="space-y-3">
                  {sessionUser.name && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Name</dt>
                      <dd className="font-medium text-foreground">
                        {sessionUser.name}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-muted-foreground">Username</dt>
                    <dd className="font-medium text-foreground">
                      {sessionUser.username}
                    </dd>
                  </div>
                  {sessionUser.email && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Email</dt>
                      <dd className="font-medium text-foreground">
                        {sessionUser.email}
                      </dd>
                    </div>
                  )}
                  {sessionUser.country && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Country</dt>
                      <dd className="font-medium text-foreground">
                        {sessionUser.country}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
              <CardFooter>
                <Button type="button" variant="outline" onClick={handleSignOut}>
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You are not signed in yet.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link to="/login">
                    <LogIn className="size-4" />
                    Go to sign in
                  </Link>
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}

export default ProfilePage
