/**
 * Root route — "/".
 *
 * Currently redirects to the public landing page at /(public)/.
 * In M11, this will become:
 *   - if user is logged in → redirect to their role dashboard
 *   - otherwise            → redirect to landing
 */

import { Redirect } from "expo-router";


export default function RootIndex() {
  return <Redirect href="/(public)/" />;
}
