import 'react';

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      jsx?: boolean;
      global?: boolean;
    }
  }
}
