import { type Href, Redirect } from 'expo-router';

/** Legacy route — original app opens Inbound hub first. */
export default function ReceivingRedirect() {
  return <Redirect href={'/inbound' as Href} />;
}
