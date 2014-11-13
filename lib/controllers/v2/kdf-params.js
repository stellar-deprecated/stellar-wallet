var kdfParams = module.exports;

kdfParams.show = function(req,res,next) {
  res.status(200).send({ 
    algorithm: 'scrypt',
    bits: 256,
    n: Math.pow(2,12),
    r: 8,
    p: 1,
  });
};
