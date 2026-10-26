import { type Href, Redirect } from 'expo-router';

/** Legacy route — original app opens Picking Methods first. */
export default function PickingRedirect() {
  return <Redirect href={'/picking-methods' as Href} />;
}
