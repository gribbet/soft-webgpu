export type Boundary = {
  normal: [number, number];
  offset: number;
};

export const boundaries = () => [
  {
    normal: [0, 1],
    offset: -0.5,
  },
];
