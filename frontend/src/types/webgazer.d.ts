declare module 'webgazer' {
  type GazeData = {
    x: number;
    y: number;
  } | null;

  type GazeListener = (data: GazeData, clock: number) => void;

  interface WebGazer {
    setGazeListener(callback: GazeListener): WebGazer;
    showVideoPreview(show: boolean): WebGazer;
    showPredictionPoints(show: boolean): WebGazer;
    getVideoElementCanvas(): HTMLCanvasElement;
    pause(): void;
    resume(): void;
    begin(): WebGazer;
    end(): void;
    clearData(): void;
    addCalibrationPoint(x: number, y: number): void;
    setRegression(regressionType: 'ridge' | 'weightedRidge' | 'threadedRidge'): WebGazer;
    setGazeListener(callback: (data: GazeData) => void): WebGazer;
  }

  const webgazer: WebGazer;
  export default webgazer;
}
