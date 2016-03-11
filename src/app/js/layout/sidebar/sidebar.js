var t = require('i18n.service.js');

Vue.component('sidebar',{
    template: require('./sidebar.html'),
    data: function() {
    	return {
        	bOpen: true,
    		bPageMode: false,
    		header: t('main navigation'),
            panel: 'main',
        };
    },
    methods: {
    	activeModule: function(index) {
    		if (this.currentModule === index) {
    			this.currentModule = undefined;
    			return false;
    		}
    		this.currentModule = index;
    	},
        showPanel: function(panel){
            return (this.panel == 'main' || this.panel == panel);
        }
	}
});

Vue.component('sidebar-item',{
	props: ['data-icon','data-label','data-content','data-component'],
    template: require('./sidebar-item.html'),
    data: function() {
    	return {
        	main: true
        };
    },
    methods: {
    	
	}
});

Vue.component('search',{
    template: require('./search.html'),
    data: function() {
    	return {
        	
        };
    },
    methods: {
    	
	}
});

Vue.component('catalog',{
    template: require('./catalog.html'),
    data: function() {
    	return {
        	tree: [
		       {
		    	    text: "Parent 1",
		    	    nodes: [
		    	      {
		    	        text: "Child 1",
		    	        nodes: [
		    	          {
		    	            text: "Grandchild 1"
		    	          },
		    	          {
		    	            text: "Grandchild 2"
		    	          }
		    	        ]
		    	      },
		    	      {
		    	        text: "Child 2"
		    	      }
		    	    ]
		    	  },
		    	  {
		    	    text: "Parent 2"
		    	  },
		    	  {
		    	    text: "Parent 3"
		    	  },
		    	  {
		    	    text: "Parent 4"
		    	  },
		    	  {
		    	    text: "Parent 5"
		    	  }
		    	]
        };
    },
    methods: {
    	
	}
});
