import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { checkAuth } from "~/.server/services/auth";

export default function Index() {
  return (
    <div
      style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8' }}
    ></div>
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  await checkAuth(request);
  return redirect('/goals');
}