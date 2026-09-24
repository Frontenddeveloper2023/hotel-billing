export const featureVerify = (featureName) => {
  return (req, res, next) => {
    if (!req.subscription) {
      return res.status(403).json({
        success: false,
        message: "Active subscription is required.",
      });
    }

    const enabled =
      req.subscription.features?.[featureName] === true;

    if (!enabled) {
      return res.status(403).json({
        success: false,
        message:
          "This feature is not included in your current plan. Please upgrade your plan to use it.",
      });
    }

    next();
  };
};