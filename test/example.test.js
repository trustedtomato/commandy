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
test('margareta pizza checkout', () => {
	expect(margaretaCheckout.program).toBe(checkoutProgram);
	expect(margaretaCheckout.args).toEqual(['margareta']);
});

const order = pizzaProgram.parse(['order','-ch','hawaii','-c','--pepperoni=little'])
expect(order.args).toEqual(['hawaii']);
expect(order.options.cheese).toEqual([true,true]);
expect(order.options.ham).toEqual([true]);
expect(order.options.pepperoni).toEqual(['little']);