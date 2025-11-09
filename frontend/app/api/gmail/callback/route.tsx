import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    // Send message to opener window
    return new NextResponse(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GMAIL_AUTH_ERROR', error: '${error}' }, 'http://localhost:1000');
            }
            window.close();
          </script>
          <p>Authentication failed: ${error}. You can close this window.</p>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }

  if (!code) {
    // Send message to opener window
    return new NextResponse(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GMAIL_AUTH_ERROR', error: 'no_code' }, 'http://localhost:1000');
            }
            window.close();
          </script>
          <p>Authentication failed: No code received. You can close this window.</p>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }

  try {
    // Forward the callback to the backend
    const backendCallbackUrl = `http://localhost:3001/api/gmail/callback?code=${code}`;
    return NextResponse.redirect(backendCallbackUrl);
  } catch (error: any) {
    console.error("Gmail callback error:", error);
    // Send message to opener window
    return new NextResponse(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GMAIL_AUTH_ERROR', error: 'callback_failed' }, 'http://localhost:1000');
            }
            window.close();
          </script>
          <p>Authentication failed: ${error.message}. You can close this window.</p>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
}
