/// <reference types="vite/client" />

declare module '*.json' {
  const value: import('./types/prototype').PrototypePageMetadataFile
  export default value
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
