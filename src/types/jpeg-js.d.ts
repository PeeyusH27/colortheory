// Type declaration for importing only the jpeg-js decoder (the package index also pulls in the
// encoder, which we never need on device).
declare module 'jpeg-js/lib/decoder' {
  interface DecodeOptions {
    useTArray?: boolean;
    formatAsRGBA?: boolean;
    colorTransform?: boolean;
    tolerantDecoding?: boolean;
    maxResolutionInMP?: number;
    maxMemoryUsageInMB?: number;
  }
  interface DecodedImage {
    width: number;
    height: number;
    data: Uint8Array;
  }
  function decode(data: ArrayBuffer | Uint8Array, options?: DecodeOptions): DecodedImage;
  export = decode;
}
