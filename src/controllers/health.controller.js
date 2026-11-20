export const getHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'CalibiAI DSA Backend is running',
    data: {
      status: 'healthy',
    },
  });
};
