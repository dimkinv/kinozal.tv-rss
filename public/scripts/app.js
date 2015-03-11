angular.module('kinozal', ['ui.router', 'ngMaterial'])
    .config(function ($stateProvider) {
        $stateProvider
            .state('home', {
                url: '/',
                templateUrl: 'public/views/home/home.view.html',
                controller: 'HomeController'
            })
            .state('root', {
                url: '',
                controller: function ($state) {
                    $state.go('home');
                }
            });
    });
