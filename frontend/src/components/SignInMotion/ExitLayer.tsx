import { useSignInExitLayer } from '../../hooks/useSignInMotion';
import { EXIT_CONTENT_CLASSES, EXIT_LAYER_CLASSES } from './constants';
import type { SignInExitLayerProps } from './types';

/**
 * The signed-out screens' frame for the motion after sign-in (bug login-welcome-motion, P7, P8).
 * At rest it has no boxes. From the success to the motion's end it is the exit layer: the very
 * sign-in page, fixed over its destination, `inert` and `aria-hidden`, so that nothing in it is
 * read or reached, while the layer itself takes the pointer. The destination isn't inert: the
 * keyboard and screen readers have it from the start. Its two elements stay the same, so the
 * page under it is never remounted
 */
export default function SignInExitLayer({ children }: SignInExitLayerProps) {
  const { exit, layerRef } = useSignInExitLayer();
  const leaving = exit !== null;
  return (
    <div
      ref={layerRef}
      aria-hidden={leaving || undefined}
      className={EXIT_LAYER_CLASSES[exit ?? 'rest']}
    >
      <div
        inert={leaving}
        className={leaving ? EXIT_CONTENT_CLASSES.exit : EXIT_CONTENT_CLASSES.rest}
      >
        {children}
      </div>
    </div>
  );
}
