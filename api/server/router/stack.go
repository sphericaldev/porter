package router

import (
	"fmt"

	"github.com/go-chi/chi"
	"github.com/porter-dev/porter/api/server/handlers/stacks"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/router"
	"github.com/porter-dev/porter/api/types"
)

func NewStackScopedRegisterer(children ...*router.Registerer) *router.Registerer {
	return &router.Registerer{
		GetRoutes: GetStackScopedRoutes,
		Children:  children,
	}
}

func GetStackScopedRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
	children ...*router.Registerer,
) []*router.Route {
	routes, projPath := getStackRoutes(r, config, basePath, factory)

	if len(children) > 0 {
		r.Route(projPath.RelativePath, func(r chi.Router) {
			for _, child := range children {
				childRoutes := child.GetRoutes(r, config, basePath, factory, child.Children...)

				routes = append(routes, childRoutes...)
			}
		})
	}

	return routes
}

func getStackRoutes(
	r chi.Router,
	config *config.Config,
	basePath *types.Path,
	factory shared.APIEndpointFactory,
) ([]*router.Route, *types.Path) {
	relPath := "/stacks"

	newPath := &types.Path{
		Parent:       basePath,
		RelativePath: relPath,
	}

	var routes []*router.Route

	// GET /api/projects/{project_id}/clusters/{cluster_id}/stacks/{name} -> stacks.NewPorterAppGetHandler
	getPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbGet,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamStackName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	getPorterAppHandler := stacks.NewGetPorterAppHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: getPorterAppEndpoint,
		Handler:  getPorterAppHandler,
		Router:   r,
	})

	// GET /api/projects/{project_id}/clusters/{cluster_id}/stacks/{name} -> stacks.NewPorterAppListHandler
	listPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbList,
			Method: types.HTTPVerbGet,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: relPath,
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	listPorterAppHandler := stacks.NewPorterAppListHandler(
		config,
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: listPorterAppEndpoint,
		Handler:  listPorterAppHandler,
		Router:   r,
	})

	// DELETE /api/projects/{project_id}/clusters/{cluster_id}/stacks -> release.NewDeletePorterAppByNameHandler
	deletePorterAppByNameEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbDelete,
			Method: types.HTTPVerbDelete,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamStackName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	deletePorterAppByNameHandler := stacks.NewDeletePorterAppByNameHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: deletePorterAppByNameEndpoint,
		Handler:  deletePorterAppByNameHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/stacks/{stack} -> stacks.NewCreatePorterAppHandler
	createPorterAppEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}", relPath, types.URLParamStackName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createPorterAppHandler := stacks.NewCreatePorterAppHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createPorterAppEndpoint,
		Handler:  createPorterAppHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/stacks/{stack}/pr -> stacks.NewOpenStackPRHandler
	createSecretAndOpenGitHubPullRequestEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbCreate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/{%s}/pr", relPath, types.URLParamStackName),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	createSecretAndOpenGitHubPullRequestHandler := stacks.NewOpenStackPRHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: createSecretAndOpenGitHubPullRequestEndpoint,
		Handler:  createSecretAndOpenGitHubPullRequestHandler,
		Router:   r,
	})

	// POST /api/projects/{project_id}/clusters/{cluster_id}/stacks/analytics -> stacks.NewPorterAppAnalyticsHandler
	porterAppAnalyticsEndpoint := factory.NewAPIEndpoint(
		&types.APIRequestMetadata{
			Verb:   types.APIVerbUpdate,
			Method: types.HTTPVerbPost,
			Path: &types.Path{
				Parent:       basePath,
				RelativePath: fmt.Sprintf("%s/analytics", relPath),
			},
			Scopes: []types.PermissionScope{
				types.UserScope,
				types.ProjectScope,
				types.ClusterScope,
			},
		},
	)

	porterAppAnalyticsHandler := stacks.NewPorterAppAnalyticsHandler(
		config,
		factory.GetDecoderValidator(),
		factory.GetResultWriter(),
	)

	routes = append(routes, &router.Route{
		Endpoint: porterAppAnalyticsEndpoint,
		Handler:  porterAppAnalyticsHandler,
		Router:   r,
	})

	return routes, newPath
}
