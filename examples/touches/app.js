"use hyperloop"

Hyperloop.defineClass(AppActivity)
	.package('com.test.app')
	.extends('android.app.Activity')
	.implements('android.view.View.OnTouchListener')
	.method(
		{
			attributes: ['public'],
			name: 'onCreate', 
			returns: 'void', 
			annotations: ['@Override'],
			arguments: [{type:'android.os.Bundle', name:'savedInstanceState'}],
			action: onCreate,
			shouldCallSuper: true // true ... Call super method before callback
		})
	.method(
		{
			attributes: ['public'],
			name: 'onTouch', 
			returns: 'boolean', 
			annotations: ['@Override'],
			arguments: [{type:'android.view.View', name:'view'},{type:'android.view.MotionEvent',name:'event'}],
			action: onTouch
		}
	).build();

function onTouch(v, e) {
	var view  = v.cast('android.view.View');
	var event = e.cast('android.view.MotionEvent');

    // start timer for iteration
    var _params = view.getLayoutParams();
    var params = _params.cast('android.view.ViewGroup$MarginLayoutParams'); // TODO params = view.getLayoutParams().cast('..') does not work
    var action = event.getAction();
    if (action == android.view.MotionEvent.ACTION_MOVE || action == android.view.MotionEvent.ACTION_UP) {
        params.topMargin = event.getRawY() - view.getHeight();
        params.leftMargin = event.getRawX() - (view.getWidth() / 2);
        view.setLayoutParams(params);
    }

	return true;
}

function onCreate(savedInstanceState) {
	console.log('onCreate from JS');
	// 'this' points to object that this function belongs to (in this case AppActivity)
	var self = this.cast('android.app.Activity');
	var main = Hyperloop.method('android.widget.FrameLayout','<init>(android.content.Context)').call(self);
	var MATCH_PARENT = android.widget.FrameLayout$LayoutParams.MATCH_PARENT;
	var TOP = android.view.Gravity.TOP;
	var mainParams = Hyperloop.method('android.widget.FrameLayout$LayoutParams', '<init>(int,int,int)').call(MATCH_PARENT, MATCH_PARENT, TOP);
	main.setLayoutParams(mainParams);

	var red = Hyperloop.method('android.view.View','<init>(android.content.Context)').call(self);
	red.setBackgroundColor(android.graphics.Color.RED);
	var redParams = Hyperloop.method('android.widget.FrameLayout$LayoutParams','<init>(int,int,int)').call(200, 200, TOP);
	red.setLayoutParams(redParams);
	red.setOnTouchListener(self);

	var blue = Hyperloop.method('android.view.View','<init>(android.content.Context)').call(self);
	blue.setBackgroundColor(android.graphics.Color.BLUE);
	var blueParams = Hyperloop.method('android.widget.FrameLayout$LayoutParams','<init>(int,int,int)').call(200, 200, TOP);
	blueParams.setMargins(0, 300, 0, 0);
	blue.setLayoutParams(blueParams);
	blue.setOnTouchListener(self);

	var yellow = Hyperloop.method('android.view.View','<init>(android.content.Context)').call(self);
	yellow.setBackgroundColor(android.graphics.Color.YELLOW);
	var yellowParams = Hyperloop.method('android.widget.FrameLayout$LayoutParams','<init>(int,int,int)').call(200, 200, TOP);
	yellowParams.setMargins(0, 600, 0, 0);
	yellow.setLayoutParams(yellowParams);
	yellow.setOnTouchListener(self);

	main.addView(yellow);
	main.addView(blue);
	main.addView(red);

	Hyperloop.method(self, 'setContentView(android.view.View)').call(main);
}

/*
var main = Hyperloop.method('android.widget.FrameLayout','<init>(android.content.Context)').call(AppActivity);
var mainParams = new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT, Gravity.TOP);
main.setLayoutParams(mainParams);

var red = new View(this);
red.setBackgroundColor(Color.RED);
var redParams = new LayoutParams(200, 200, Gravity.TOP);
red.setLayoutParams(redParams);
red.setOnTouchListener(drag);

var blue = new View(this);
blue.setBackgroundColor(Color.BLUE);
var blueParams = new LayoutParams(200, 200, Gravity.TOP);
blueParams.setMargins(0, 300, 0, 0);
blue.setLayoutParams(blueParams);
blue.setOnTouchListener(drag);

var yellow = new View(this);
yellow.setBackgroundColor(Color.YELLOW);
var yellowParams = new LayoutParams(200, 200, Gravity.TOP);
yellowParams.setMargins(0, 600, 0, 0);
yellow.setLayoutParams(yellowParams);
yellow.setOnTouchListener(drag);

main.addView(yellow);
main.addView(blue);
main.addView(red);

setContentView(main);
*/
