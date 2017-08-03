const {Program} = require('../');

const checkoutProgram = new Program();

const orderProgram = new Program([
	['p', 'pepperoni'],
	['c', 'cheese'],
	['h', 'ham']
])

const pizzaProgram = new Program({
	checkout: checkoutProgram,
	order: orderProgram
});

const margaretaCheckout = pizzaProgram.parse(['checkout','margareta']);
console.log(margaretaCheckout.program === checkoutProgram);
// => true
console.log(margaretaCheckout.args)
// => [ 'margareta' ]

const order = pizzaProgram.parse(['order','-ch','hawaii','-c','--pepperoni=little'])
console.log(order.args);
// => [ 'hawaii' ]
console.log(order.options.cheese);
// => [ true, true ]
console.log(order.options.ham);
// => [ true ]
console.log(order.options.pepperoni);
// => [ 'little' ]