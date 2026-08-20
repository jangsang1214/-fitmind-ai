/* GARANG V9.9 touch root-fix: intentionally inert.
   The previous version used a body-wide MutationObserver while rewriting
   styles on the same DOM it observed, which could create a mutation loop
   and make mobile UI appear frozen. Touch protection is now handled by the
   minimal guard injected in index.html. */
(function(){ window.GARANGTouchGuard={version:'9.9.3-rootfix'}; })();
