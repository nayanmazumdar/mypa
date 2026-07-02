Two separate projects in two folders, keep them in sin
Frontend (SPA)
	language: React, vite, tailwind css
	Tools: Redux (store), react-tookkit

Structure:
src/

├── App.jsx
├── main.jsx

├── api/

│   ├── axios.js
│   ├── auth.api.js
│   ├── product.api.js
│   ├── sales.api.js
│   └── ...

├── assets/

│   ├── images/
│   ├── icons/
│   └── logo/

├── components/

│   ├── common/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── cards/
│   ├── modal/
│   ├── barcode/
│   └── loading/

├── features/

│   ├── auth/
│   ├── dashboard/
│   ├── products/
│   ├── categories/
│   ├── inventory/
│   ├── customers/
│   ├── suppliers/
│   ├── purchases/
│   ├── sales/
│   ├── reports/
│   ├── settings/
│   └── sync/

├── hooks/

├── layouts/

│   ├── DashboardLayout.jsx
│   ├── AuthLayout.jsx
│   └── BlankLayout.jsx

├── pages/

│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Products.jsx
│   ├── Categories.jsx
│   ├── Inventory.jsx
│   ├── Sales.jsx
│   ├── Purchase.jsx
│   ├── Reports.jsx
│   ├── Customers.jsx
│   ├── Suppliers.jsx
│   ├── Settings.jsx
│   └── NotFound.jsx

├── router/

│   ├── index.jsx
│   ├── ProtectedRoute.jsx
│   └── routes.js

├── services/

├── store/

│   ├── authStore.js
│   ├── productStore.js
│   ├── inventoryStore.js
│   └── ...

├── styles/

├── types/

├── utils/

├── constants/

├── validations/

└── tests/

public/

package.json





Backend
	Language: 
		Node: environment
		Express: 
			Js Library, REST APIs.
			Swagger docs, 
			Libs: nodemon (live reload), jwt for auth, 
		Sqlite: offline support.
		Database:
				MySql: transactional data (user, products).
	Project structure:
		shopkeeper-backend/
│
├── src/
│   ├── config/
│   │   ├── mysql.js
│   │   ├── sqlite.js
│   │   ├── swagger.js
│   │   ├── env.js
│   │   └── logger.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js 
│   │   ├── user.routes.js
│   │   ├── product.routes.js
│   │   ├── category.routes.js
│   │   ├── customer.routes.js
│   │   ├── supplier.routes.js
│   │   ├── inventory.routes.js
│   │   ├── purchase.routes.js
│   │   ├── sales.routes.js
│   │   ├── invoice.routes.js
│   │   ├── payment.routes.js
│   │   └── report.routes.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── inventory.controller.js
│   │   ├── sales.controller.js
│   │   ├── purchase.controller.js
│   │   └── ...
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── product.service.js
│   │   ├── inventory.service.js
│   │   ├── sales.service.js
│   │   ├── purchase.service.js
│   │   ├── sync.service.js
│   │   └── report.service.js
│   │
│   ├── repositories/
│   │   ├── mysql/
│   │   │     ├── product.repository.js
│   │   │     ├── sales.repository.js
│   │   │     └── ...
│   │   │
│   │   └── sqlite/
│   │         ├── product.repository.js
│   │         ├── sales.repository.js
│   │         └── ...
│   │
│   ├── models/
│   │   ├── Product.js
│   │   ├── Customer.js
│   │   ├── Supplier.js
│   │   ├── User.js
│   │   ├── Purchase.js
│   │   ├── Sale.js
│   │   └── Inventory.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── validate.middleware.js
│   │   └── upload.middleware.js
│   │
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── product.validator.js
│   │   ├── sale.validator.js
│   │   └── purchase.validator.js
│   │
│   ├── utils/
│   │   ├── response.js
│   │   ├── pagination.js
│   │   ├── constants.js
│   │   ├── jwt.js
│   │   ├── hash.js
│   │   └── helper.js
│   │
│   ├── docs/
│   │   └── swagger.yaml
│   │
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── sqlite/
│   │        └── shop.db
│   │
│   ├── app.js
│   └── server.js
│
├── uploads/
│
├── logs/
│
├── tests/
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── README.md



login
	username:
	password: 

	backend
		/login/auth


		Security --> JWT (json web token) --> RBAC (roleback access control) (SALESMAN, ADMIN, SUPERADMIN)

		{
			token:
			expire: timestamp 
			refreshToken:
		}

Frontend
	Store session-storage/local storage
	/dashbnoard --> headers add token



